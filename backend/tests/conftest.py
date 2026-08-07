"""测试夹具：内存 SQLite + fakeredis + TestClient。

db_session/redis_client 保持 function scope（兼容 xdist 并行）。
优化：测试环境使用 bcrypt rounds=4 加速哈希操作。
"""

import asyncio
import os
import sys
from collections.abc import AsyncGenerator

import fakeredis.aioredis as fakeredis_aio
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
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

# 测试专用引擎与会话工厂
_test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
)
_TestSessionLocal = async_sessionmaker(
    bind=_test_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


@pytest.fixture(scope="session")
def event_loop():
    """全局事件循环。"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def setup_db():
    """每个测试前建表、测试后清理。"""
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


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
async def client() -> AsyncGenerator[AsyncClient, None]:
    """提供 ASGI TestClient，注入测试 DB 与 Redis。"""

    async def _override_db():
        async with _TestSessionLocal() as session:
            yield session

    fake_redis = fakeredis_aio.FakeRedis(decode_responses=True)
    reset_redis()

    async def _override_redis():
        return fake_redis

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_redis] = _override_redis

    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
    await fake_redis.aclose()
