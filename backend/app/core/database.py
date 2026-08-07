"""数据库异步引擎与会话工厂。"""

from collections.abc import AsyncGenerator

import structlog
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# SQLite 需要禁用 check_same_thread；统一以 dict 传 connect_args
_is_sqlite = settings.db_url.startswith("sqlite")

_pool_kw = {}
_connect_args: dict = {}
if _is_sqlite:
    # SQLite 启用 WAL 模式提升并发读性能（开发环境）
    _connect_args = {
        "check_same_thread": False,
        "timeout": 30,
    }
else:
    _pool_kw = {
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_recycle": settings.db_pool_recycle,
        "pool_timeout": 30,
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
