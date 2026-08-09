"""测试夹具：共享文件 SQLite + fakeredis + TestClient。

核心优化（测试平台专项）：
- 共享文件库：sqlite+aiosqlite:///<临时文件>，跨连接共享表结构，
  替代原 :memory:（每连接独立库）导致"每测试 create_all/drop_all"的冷启动开销。
- session 级只建一次表（同步引擎建表，规避 async event loop 限制）；
  每个测试前仅 DELETE 清空数据（SQLite 无 AUTOINCREMENT 时自增从 1 重置）。
- xdist 并行：每个 worker 独立临时库文件，天然隔离互不干扰。

db_session/redis_client 保持 function scope（兼容 xdist 并行）。
优化：测试环境使用 bcrypt rounds=4 加速哈希操作。
"""

import asyncio
import os
import shutil
import sys
import tempfile
import time as _time_mod
from collections.abc import AsyncGenerator
from pathlib import Path

import fakeredis.aioredis as fakeredis_aio
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# 测试环境：降低 bcrypt cost factor（4 轮 vs 生产 12 轮），加速认证测试
os.environ.setdefault("BCRYPT_ROUNDS", "4")
os.environ["DB_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["DEBUG"] = "true"

# 将 backend 目录加入 sys.path（确保 from app 导入可用）
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_db
from app.core.redis import get_redis, reset_redis
from app.main import app
from app.models.base import Base

# ── 共享文件库（每 worker 独立临时文件，惰性创建）────────────
# 目录在 create_schema fixture 内创建，避免纯 unit 测试（不使用 DB）时残留。

_TEST_TMP_DIR: Path | None = None
_TEST_DB_PATH: Path | None = None
_sync_engine = None
_async_engine = None
_TestSessionLocal = None


@pytest.fixture(scope="session")
def event_loop():
    """全局事件循环。"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def create_schema():
    """全局只建一次表（同步建表，每个 worker 各自建库，惰性初始化）。"""
    global _TEST_TMP_DIR, _TEST_DB_PATH, _sync_engine, _async_engine, _TestSessionLocal

    if _async_engine is None:
        _TEST_TMP_DIR = Path(tempfile.mkdtemp(prefix="novel-test-"))
        _TEST_DB_PATH = _TEST_TMP_DIR / "test.db"

        # 仅清理 1 小时前的残留临时库（避免误删并行 worker 正在使用的目录）
        _stale_cutoff = _time_mod.time() - 3600
        for _stale in Path(tempfile.gettempdir()).glob("novel-test-*"):
            try:
                if _stale != _TEST_TMP_DIR and _stale.stat().st_mtime < _stale_cutoff:
                    shutil.rmtree(_stale, ignore_errors=True)
            except OSError:
                pass

        # 同步引擎：仅用于一次性建表（避开 async event loop 限制）
        _sync_engine = create_engine(
            f"sqlite:///{_TEST_DB_PATH}",
            connect_args={"check_same_thread": False},
        )
        # 异步引擎：测试会话使用，连接同一文件库
        _async_engine = create_async_engine(
            f"sqlite+aiosqlite:///{_TEST_DB_PATH}",
            connect_args={"check_same_thread": False},
        )
        _TestSessionLocal = async_sessionmaker(
            bind=_async_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )

    Base.metadata.create_all(_sync_engine)
    yield
    _sync_engine.dispose()
    if _TEST_TMP_DIR is not None:
        shutil.rmtree(_TEST_TMP_DIR, ignore_errors=True)


@pytest_asyncio.fixture
async def setup_db(create_schema):
    """每个测试前清空数据（替代 create_all/drop_all，保留表结构）。"""
    async with _async_engine.begin() as conn:
        for name in sorted(Base.metadata.tables):
            await conn.execute(text(f'DELETE FROM "{name}"'))
    yield


@pytest_asyncio.fixture
async def db_session(setup_db) -> AsyncGenerator[AsyncSession, None]:
    """提供事务内会话，测试结束自动回滚。"""
    async with _TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def redis_client():
    """提供 fakeredis 客户端。"""
    reset_redis()
    fake = fakeredis_aio.FakeRedis(decode_responses=True)
    yield fake
    await fake.aclose()


@pytest_asyncio.fixture
def db_query_counter(db_session):
    """提供 DB 查询计数器（用于 N+1 查询断言）。"""
    counts = [0]

    def _before(*_args, **_kwargs):
        counts[0] += 1

    def reset():
        counts[0] = 0

    engine = db_session.get_bind()
    if hasattr(engine, "sync_engine"):
        engine = engine.sync_engine
    event.listen(engine, "before_cursor_execute", _before)
    yield counts, reset
    event.remove(engine, "before_cursor_execute", _before)


@pytest_asyncio.fixture
async def client(setup_db) -> AsyncGenerator[AsyncClient, None]:
    """提供 ASGI TestClient，注入测试 DB 与 Redis。"""

    # 测试环境关闭限流，避免慢速限流（如打赏 1/分钟）阻碍用例重复调用
    from app.core.limiter import limiter

    limiter.enabled = False

    async def _override_db():
        async with _TestSessionLocal() as session:
            yield session

    fake_redis = fakeredis_aio.FakeRedis(decode_responses=True)
    reset_redis()

    async def _override_redis():
        return fake_redis

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_redis] = _override_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
    await fake_redis.aclose()
