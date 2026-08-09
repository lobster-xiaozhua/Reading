"""数据库异步引擎与会话工厂。"""

import re
import time
from collections.abc import AsyncGenerator

import structlog
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.metrics import record_slow_query

# SQL 归一化：字符串字面量与数字替换为占位符，聚合同结构慢查询
_SQL_STR_RE = re.compile(r"'[^']*'")
_SQL_NUM_RE = re.compile(r"\b\d+\b")


def _normalize_sql(statement: str) -> str:
    """归一化 SQL（去字面量/数字/空白），用于慢查询 Top 聚合。"""
    s = _SQL_STR_RE.sub("?", str(statement))
    s = _SQL_NUM_RE.sub("?", s)
    return " ".join(s.split())[:200]

# SQLite 需要禁用 check_same_thread；统一以 dict 传 connect_args
_is_sqlite = settings.db_url.startswith("sqlite")

_pool_kw = {}
_connect_args: dict = {}
if _is_sqlite:
    _connect_args = {
        "check_same_thread": False,
        "timeout": 30,
    }
else:
    _pool_kw = {
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_recycle": settings.db_pool_recycle,
        "pool_timeout": 15,
    }

engine = create_async_engine(
    settings.db_url,
    echo=settings.db_echo,
    pool_pre_ping=True,
    future=True,
    connect_args=_connect_args or None,
    **_pool_kw,
)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, _connection_record):
    """SQLite 连接时启用 WAL + 合理缓存，提升并发读写性能。"""
    if not _is_sqlite:
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA cache_size=-8000")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# 慢查询监控：记录单条 SQL 执行耗时，超过阈值记日志并计入 /metrics
_db_logger = structlog.get_logger("api.database.slow")


@event.listens_for(engine.sync_engine, "before_cursor_execute")
def _slow_query_start(_conn, _cursor, _statement, _parameters, _context, _executemany):
    _conn.info.setdefault("_query_start", []).append(time.perf_counter())


@event.listens_for(engine.sync_engine, "after_cursor_execute")
def _slow_query_check(conn, _cursor, statement, _parameters, _context, _executemany):
    starts = conn.info.get("_query_start")
    if not starts:
        return
    start = starts.pop()
    duration_ms = (time.perf_counter() - start) * 1000
    if duration_ms <= settings.slow_query_threshold_ms:
        return
    record_slow_query(duration_ms, _normalize_sql(str(statement)))
    _db_logger.warning(
        "slow query",
        duration_ms=round(duration_ms, 1),
        threshold_ms=settings.slow_query_threshold_ms,
        statement=str(statement)[:300],
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI 依赖：提供异步会话，请求结束自动关闭。"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            logger = structlog.get_logger("api.database")
            logger.exception("Database session error")
            await session.rollback()
            raise
        finally:
            await session.close()


async def ensure_schema_compat() -> None:
    """启动时轻量兼容迁移：为已存在但缺失列的旧表补充缺失列。

    ``create_all(checkfirst=True)`` 不会 ALTER 已有表，模型新增列后旧库会缺列
    （例如评论软删引入的 ``comments.deleted``、审核历史补充的
    ``audit_histories.operator_ip/user_agent``）。此处为每个已存在表补齐
    模型中有而库中缺失的列（SQLite ``ALTER TABLE ADD COLUMN``），仅对带
    默认值的列执行，避免无默认值 NOT NULL 列的迁移风险；生产依赖 alembic。
    """
    from sqlalchemy import inspect, text

    from app.models import Base

    if not _is_sqlite:
        return
    compat_logger = structlog.get_logger("api.database")
    dialect = engine.sync_engine.dialect
    async with engine.begin() as conn:
        table_names = await conn.run_sync(
            lambda sync_conn: inspect(sync_conn).get_table_names()
        )
        for table_name, table in Base.metadata.tables.items():
            if table_name not in table_names:
                continue
            existing = await conn.run_sync(
                lambda sync_conn, t=table_name: [
                    c["name"] for c in inspect(sync_conn).get_columns(t)
                ]
            )
            for column in table.columns:
                if column.name in existing:
                    continue
                ddl = _build_add_column_ddl(column, dialect)
                if ddl is None:
                    compat_logger.warning(
                        "schema compat: skip column %s.%s (no default)",
                        table_name, column.name,
                    )
                    continue
                await conn.execute(text(ddl))
                compat_logger.info(
                    "schema compat: added column %s.%s", table_name, column.name
                )


def _build_add_column_ddl(column, dialect) -> str | None:
    """构造 ``ALTER TABLE ... ADD COLUMN ...`` 语句。

    仅支持可安全添加的列（可空，或带常量默认值）；复合默认值（函数等）
    返回 None 跳过，避免迁移风险。
    """
    from sqlalchemy.schema import CreateColumn

    nullable = column.nullable
    default = None
    if column.server_default is not None:
        default = column.server_default.arg
    elif column.default is not None and not callable(column.default.arg):
        default = column.default.arg
    if not nullable and default is None:
        return None
    col_ddl = str(CreateColumn(column).compile(dialect=dialect))
    if default is not None:
        if isinstance(default, bool):
            default_sql = "1" if default else "0"
        elif isinstance(default, (int, float)):
            default_sql = str(default)
        else:
            default_sql = f"'{default}'"
        col_ddl = f"{col_ddl} DEFAULT {default_sql}"
    return f"ALTER TABLE {column.table.name} ADD COLUMN {col_ddl}"
