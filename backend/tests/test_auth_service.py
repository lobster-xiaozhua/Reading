"""鉴权服务测试：登录、刷新、登出、当前用户。"""

import pytest

from app.api.deps import AdminContext
from app.core.exceptions import BizError
from app.core.redis import CacheKeys
from app.core.security import hash_password
from app.models.user import Admin
from app.schemas.enums import ALL_PERMISSIONS
from app.services.auth_service import AuthService


@pytest.fixture
def svc(db_session, redis_client):
    return AuthService(db_session, redis_client)


async def _create_admin(session, **kwargs):
    defaults = {
        "username": "admin",
        "password_hash": hash_password("admin123"),
        "nickname": "管理员",
        "enabled": 1,
    }
    defaults.update(kwargs)
    admin = Admin(**defaults)
    session.add(admin)
    await session.flush()
    return admin


class TestLogin:
    async def test_login_success(self, svc, db_session):
        await _create_admin(db_session)
        result = await svc.login("admin", "admin123")
        assert result.token is not None
        assert result.refresh_token is not None
        assert result.user.username == "admin"

    async def test_login_repairs_stale_demo_password_in_debug(self, svc, db_session):
        await _create_admin(db_session, password_hash=hash_password("stale-password"))

        result = await svc.login("admin", "admin123")

        assert result.user.username == "admin"

    async def test_login_wrong_password(self, svc, db_session):
        await _create_admin(db_session)
        with pytest.raises(BizError):
            await svc.login("admin", "wrong_password")

    async def test_login_user_not_found(self, svc):
        with pytest.raises(BizError):
            await svc.login("nonexistent", "password")

    async def test_login_disabled_admin(self, svc, db_session, monkeypatch):
        """禁用账号无法登录（绕过 demo 自动修复逻辑）。"""
        await _create_admin(db_session, enabled=0)
        # monkeypatch 阻止 _ensure_demo_admin 被调用
        async def noop():
            pass
        monkeypatch.setattr(svc, '_ensure_demo_admin', noop)
        with pytest.raises(BizError, match="已被禁用"):
            await svc.login("admin", "admin123")

    async def test_login_locked_account(self, svc, db_session, redis_client):
        await _create_admin(db_session)
        fail_key = CacheKeys.login_fail("admin")
        await redis_client.sadd(fail_key, "ip1", "ip2", "ip3", "ip4", "ip5")
        with pytest.raises(BizError, match="已被锁定"):
            await svc.login("admin", "admin123", client_ip="ip6")

    async def test_login_increments_fail_count(self, svc, db_session, redis_client):
        await _create_admin(db_session)
        for i in range(3):
            with pytest.raises(BizError):
                await svc.login("admin", "wrong", client_ip=f"ip{i}")
        fail_key = CacheKeys.login_fail("admin")
        distinct = int(await redis_client.scard(fail_key) or 0)
        assert distinct == 3

    async def test_login_same_ip_not_locked(self, svc, db_session, redis_client):
        """同 IP 多次失败不累计（防单 IP 刷锁他人账号）。"""
        await _create_admin(db_session)
        for _ in range(10):
            with pytest.raises(BizError):
                await svc.login("admin", "wrong", client_ip="same-ip")
        fail_key = CacheKeys.login_fail("admin")
        distinct = int(await redis_client.scard(fail_key) or 0)
        assert distinct == 1

    async def test_login_resets_fail_count_on_success(self, svc, db_session, redis_client):
        await _create_admin(db_session)
        fail_key = CacheKeys.login_fail("admin")
        await redis_client.sadd(fail_key, "ip1", "ip2", "ip3")
        result = await svc.login("admin", "admin123", client_ip="ip1")
        assert result.token is not None
        count = int(await redis_client.scard(fail_key) or 0)
        assert count == 0

    async def test_login_remember_extends_ttl(self, svc, db_session):
        await _create_admin(db_session)
        result = await svc.login("admin", "admin123", remember=True)
        assert result.token is not None


class TestRefresh:
    async def test_refresh_success(self, svc, db_session, redis_client):
        await _create_admin(db_session)
        login = await svc.login("admin", "admin123")
        result = await svc.refresh(login.refresh_token)
        assert result.token is not None
        assert result.refresh_token is not None

    async def test_refresh_invalid_token(self, svc):
        with pytest.raises(BizError):
            await svc.refresh("invalid_token")

    async def test_refresh_stale_token_rejected(self, svc, db_session, redis_client):
        await _create_admin(db_session)
        login = await svc.login("admin", "admin123")
        refresh_key = CacheKeys.refresh_token(login.refresh_token)
        await redis_client.delete(refresh_key)
        with pytest.raises(BizError):
            await svc.refresh(login.refresh_token)

    async def test_refresh_wrong_token_type(self, svc):
        from app.core.security import create_token

        access_token, _ = create_token(1, "access", ttl=3600)
        with pytest.raises(BizError):
            await svc.refresh(access_token)

    async def test_refresh_disabled_admin_rejected(self, svc, db_session, redis_client):
        admin = await _create_admin(db_session)
        login = await svc.login("admin", "admin123")
        admin.enabled = 0
        await db_session.commit()
        with pytest.raises(BizError):
            await svc.refresh(login.refresh_token)


class TestEnsureDemoAdmin:
    async def test_creates_demo_admin_when_missing(self, svc, db_session):
        from sqlalchemy import select

        from app.models.user import Admin

        existing = await svc._find_admin("admin")
        assert existing is None
        await svc._ensure_demo_admin()
        created = (await db_session.execute(select(Admin).where(Admin.username == "admin"))).scalar_one()
        assert created is not None
        assert created.enabled == 1

    async def test_keeps_existing_demo_admin(self, svc, db_session):
        from sqlalchemy import select

        from app.models.user import Admin

        await _create_admin(db_session)
        await svc._ensure_demo_admin()
        admins = (await db_session.execute(select(Admin))).scalars().all()
        # 已有 admin 保留不重复，并补齐其余 3 个演示账号为禁用状态
        assert len(admins) == 4
        assert {a.username for a in admins} == {
            "admin",
            "content",
            "auditor",
            "operation",
        }
        # admin 启用，其他三个禁用
        admin = next(a for a in admins if a.username == "admin")
        assert admin.enabled == 1
        for username in ("content", "auditor", "operation"):
            other = next(a for a in admins if a.username == username)
            assert other.enabled == 0


class TestLogout:
    async def test_logout_success(self, svc, db_session, redis_client):
        await _create_admin(db_session)
        login = await svc.login("admin", "admin123")
        result = await svc.logout(login.token)
        assert result is True

    async def test_logout_invalid_token(self, svc):
        result = await svc.logout("invalid_token")
        assert result is True


class TestGetCurrentUser:
    async def test_get_current_user(self, svc, db_session):
        await _create_admin(db_session)
        ctx = AdminContext(
            id=1, username="admin", roles=["super-admin"], permissions=ALL_PERMISSIONS
        )
        result = await svc.get_current_user(ctx)
        assert result.username == "admin"

    async def test_get_current_user_not_found(self, svc):
        ctx = AdminContext(id=99999, username="ghost", roles=[], permissions=[])
        result = await svc.get_current_user(ctx)
        assert result is not None
        assert result.username == "ghost"


class TestDisabledAccounts:
    async def test_disabled_account_cannot_login(self, svc, db_session):
        await _create_admin(db_session, username="content", password_hash=hash_password("content123"), enabled=0)
        with pytest.raises(BizError, match="已被禁用"):
            await svc.login("content", "content123")
