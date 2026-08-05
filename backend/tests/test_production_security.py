"""生产环境安全行为测试：DEBUG=false 时禁用 demo 降级与弱密钥。"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.main import app
from app.models.base import Base


def test_production_rejects_weak_jwt_secret():
    """生产环境使用默认弱密钥时配置校验必须失败。"""
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(debug=False, jwt_secret="change-me-in-production-min-32-bytes!!")


def test_production_rejects_short_jwt_secret():
    """生产环境密钥长度不足 32 字节时必须失败。"""
    with pytest.raises(ValueError, match="32 字节"):
        Settings(debug=False, jwt_secret="short-secret")


def test_production_accepts_strong_jwt_secret():
    """生产环境配置强密钥时校验通过。"""
    s = Settings(debug=False, jwt_secret="a" * 64)
    assert s.jwt_secret == "a" * 64


def test_debug_allows_weak_jwt_secret():
    """DEBUG 模式不拦截弱密钥（开发便利）。"""
    s = Settings(debug=True, jwt_secret="dev")
    assert s.debug is True


@pytest.mark.asyncio
async def test_production_endpoint_rejects_missing_token():
    """生产环境（DEBUG=false）无 token 访问 B 端接口必须 401，不得降级 demo 账号。"""
    import app.api.deps as deps_mod
    import app.core.redis as redis_mod
    import app.core.security as security_mod

    prod = Settings(debug=False, jwt_secret="c" * 64)
    orig_settings = deps_mod.settings

    class _FakeRedis:
        async def get(self, *a, **k):
            return None

    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    session_factory = async_sessionmaker(
        bind=test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def _override_db():
        async with session_factory() as session:
            yield session

    async def _override_redis():
        return _FakeRedis()

    try:
        deps_mod.settings = prod
        redis_mod.settings = prod
        security_mod.settings = prod

        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        app.dependency_overrides[get_db] = _override_db
        app.dependency_overrides[get_redis_client] = _override_redis

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            resp = await c.get("/api/v1/b/auth/me")
            assert resp.status_code == 401
            body = resp.json()
            assert body["code"] != 0
    finally:
        deps_mod.settings = orig_settings
        redis_mod.settings = orig_settings
        security_mod.settings = orig_settings
        app.dependency_overrides.clear()
        await test_engine.dispose()


@pytest.mark.asyncio
async def test_production_missing_token_does_not_need_redis():
    """生产模式无 token 时即使 Redis 不可用也必须返回 401，而非 500。

    验证鉴权依赖对 Redis 是惰性获取：未携带 token 时不会触发 Redis 连接。
    """
    import app.api.deps as deps_mod
    import app.core.redis as redis_mod
    import app.core.security as security_mod

    prod = Settings(debug=False, jwt_secret="d" * 64)
    orig_settings = deps_mod.settings

    async def _boom_redis():
        raise RuntimeError("Redis 连接失败，服务不可用")

    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    session_factory = async_sessionmaker(
        bind=test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def _override_db():
        async with session_factory() as session:
            yield session

    try:
        deps_mod.settings = prod
        redis_mod.settings = prod
        security_mod.settings = prod

        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        app.dependency_overrides[get_db] = _override_db
        app.dependency_overrides[get_redis_client] = _boom_redis

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            resp = await c.get("/api/v1/b/auth/me")
            assert resp.status_code == 401
            body = resp.json()
            assert body["code"] != 0
    finally:
        deps_mod.settings = orig_settings
        redis_mod.settings = orig_settings
        security_mod.settings = orig_settings
        app.dependency_overrides.clear()
        await test_engine.dispose()
