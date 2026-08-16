"""B 端鉴权服务（§8.1）。

双 Token 鉴权：access token 8h + refresh token 30d/90d。
登录失败锁定、会话管理走 Redis。
登录时查询 admin.role_key → 获取真实角色权限，替代硬编码 super-admin。
"""

from typing import TYPE_CHECKING

import redis.asyncio as redis
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BizError, ErrorCode
from app.core.redis import CacheKeys
from app.core.security import create_token, decode_token, hash_password, verify_password
from app.models.user import Admin
from app.repositories.role_repo import RoleRepository
from app.schemas.auth import AdminUserInfo, BLoginResponse
from app.schemas.enums import ALL_PERMISSIONS

if TYPE_CHECKING:
    from app.api.deps import AdminContext

from app.utils.time import now_ms as _now_ms

logger = structlog.get_logger(__name__)

_LOGIN_FAIL_LIMIT = 5
_LOGIN_LOCK_TTL = 15 * 60  # 15 分钟
_DEMO_ADMINS = [
    ("admin", "admin123", "演示管理员", "super-admin"),
    ("content", "content123", "内容管理员", "content-admin"),
    ("auditor", "auditor123", "审核员", "auditor"),
    ("operation", "operation123", "运营管理员", "operation-admin"),
]


class AuthService:
    """B 端鉴权服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.role_repo = RoleRepository(session)

    # ── 角色权限解析 ─────────────────────────────────────
    async def _resolve_roles_perms(
        self, admin: Admin
    ) -> tuple[list[str], list[str]]:
        """根据管理员角色解析 roles 与 permissions。

        super-admin 拥有全部权限；其余角色查询 role_permissions 表。
        """
        role_key = admin.role_key or "super-admin"
        if role_key == "super-admin":
            return ["super-admin"], ALL_PERMISSIONS
        perms = await self.role_repo.get_permissions(role_key)
        return [role_key], perms

    # ── 登录 ──────────────────────────────────────────
    async def login(
        self, username: str, password: str, remember: bool = False, client_ip: str = ""
    ) -> BLoginResponse:
        # 登录失败按 username 记录不同来源 IP 集合，防单 IP 刷锁他人账号
        fail_key = CacheKeys.login_fail(username)
        ip = client_ip or "unknown"
        distinct = int(await self.redis.scard(fail_key) or 0)
        if distinct >= _LOGIN_FAIL_LIMIT:
            raise BizError(ErrorCode.ACCOUNT_LOCKED, "账号已被锁定，请 15 分钟后重试")

        is_demo_login = settings.debug and any(
            username == demo_username and password == demo_password
            for demo_username, demo_password, _, _ in _DEMO_ADMINS
        )
        if is_demo_login:
            # 开发库可能保留过期的演示密码；使用预置凭据时恢复统一演示账号。
            await self._ensure_demo_admin()

        admin = await self._find_admin(username)
        if not admin or not verify_password(password, admin.password_hash):
            await self.redis.sadd(fail_key, ip)
            await self.redis.expire(fail_key, _LOGIN_LOCK_TTL)
            raise BizError(ErrorCode.INVALID_CREDENTIALS, "用户名或密码错误")

        if not admin.enabled:
            raise BizError(ErrorCode.ACCOUNT_LOCKED, "账号已被禁用")

        # 清除失败计数
        await self.redis.delete(fail_key)

        # 解析真实角色权限（替代硬编码 super-admin）
        roles, perms = await self._resolve_roles_perms(admin)
        extra = {
            "username": admin.username,
            "nickname": admin.nickname,
            "roles": roles,
            "permissions": perms,
        }
        access_ttl = settings.access_token_ttl
        refresh_ttl = settings.refresh_token_ttl_long if remember else settings.refresh_token_ttl
        access_token, expires_at = create_token(admin.id, "access", ttl=access_ttl, extra=extra)
        refresh_token, _ = create_token(admin.id, "refresh", ttl=refresh_ttl, extra=extra)

        # 存入 Redis
        await self.redis.set(CacheKeys.access_token(access_token), str(admin.id), ex=access_ttl)
        await self.redis.set(CacheKeys.refresh_token(refresh_token), str(admin.id), ex=refresh_ttl)

        # 更新最后登录时间
        admin.last_login_at = _now_ms()
        await self.session.commit()

        return BLoginResponse(
            token=access_token,
            user=AdminUserInfo(
                id=str(admin.id),
                username=admin.username,
                nickname=admin.nickname,
                avatar=admin.avatar,
                email=admin.email,
                roles=roles,
                permissions=perms,
                last_login_at=admin.last_login_at,
                enabled=bool(admin.enabled),
            ),
            expires_at=expires_at,
            refresh_token=refresh_token,
        )

    # ── 刷新 Token ─────────────────────────────────────────
    async def refresh(self, refresh_token: str) -> BLoginResponse:
        """刷新 access token（轮换 refresh token）。

        Args:
            refresh_token: 刷新令牌。

        Returns:
            新的登录响应（含双 Token）。
        """
        try:
            payload = decode_token(refresh_token)
        except Exception as err:
            logger.warning("Token decode failed", exc_info=True)
            raise BizError(ErrorCode.TOKEN_EXPIRED, "refresh token 无效") from err

        if payload.get("type") != "refresh":
            raise BizError(ErrorCode.TOKEN_EXPIRED, "token 类型错误")

        cached = await self.redis.get(CacheKeys.refresh_token(refresh_token))
        if not cached:
            raise BizError(ErrorCode.TOKEN_EXPIRED, "会话已失效，请重新登录")

        admin_id = int(cached)
        admin = await self.session.get(Admin, admin_id)
        if not admin or not admin.enabled:
            raise BizError(ErrorCode.ACCOUNT_LOCKED, "账号不可用")

        # 轮换：旧 refresh 失效
        await self.redis.delete(CacheKeys.refresh_token(refresh_token))

        # 解析真实角色权限
        roles, perms = await self._resolve_roles_perms(admin)
        extra = {
            "username": admin.username,
            "nickname": admin.nickname,
            "roles": roles,
            "permissions": perms,
        }
        access_ttl = settings.access_token_ttl
        refresh_ttl = settings.refresh_token_ttl
        access_token, expires_at = create_token(admin.id, "access", ttl=access_ttl, extra=extra)
        new_refresh, _ = create_token(admin.id, "refresh", ttl=refresh_ttl, extra=extra)
        await self.redis.set(CacheKeys.access_token(access_token), str(admin.id), ex=access_ttl)
        await self.redis.set(CacheKeys.refresh_token(new_refresh), str(admin.id), ex=refresh_ttl)

        return BLoginResponse(
            token=access_token,
            user=AdminUserInfo(
                id=str(admin.id),
                username=admin.username,
                nickname=admin.nickname,
                avatar=admin.avatar,
                email=admin.email,
                roles=roles,
                permissions=perms,
                last_login_at=admin.last_login_at,
                enabled=bool(admin.enabled),
            ),
            expires_at=expires_at,
            refresh_token=new_refresh,
        )

    # ── 登出 ──────────────────────────────────────────
    async def logout(self, access_token: str, refresh_token: str | None = None) -> bool:
        """登出，使 access token 与 refresh token 失效。

        Args:
            access_token: 访问令牌。
            refresh_token: 可选，刷新令牌（一并失效，防止登出后续期）。

        Returns:
            操作是否成功。
        """
        await self.redis.delete(CacheKeys.access_token(access_token))
        if refresh_token:
            await self.redis.delete(CacheKeys.refresh_token(refresh_token))
        return True

    # ── 当前用户 ─────────────────────────────────────────
    async def get_current_user(self, admin: "AdminContext") -> AdminUserInfo:
        """返回当前管理员信息。

        优先从数据库加载完整信息；demo 模式（无 token）下直接使用上下文。
        """

        db_admin = await self.session.get(Admin, admin.id)
        if db_admin:
            return AdminUserInfo(
                id=str(db_admin.id),
                username=db_admin.username,
                nickname=db_admin.nickname,
                avatar=db_admin.avatar,
                email=db_admin.email,
                roles=admin.roles,
                permissions=admin.permissions,
                last_login_at=db_admin.last_login_at,
                enabled=bool(db_admin.enabled),
            )
        # demo 模式：DB 无记录时用上下文兜底
        return AdminUserInfo(
            id=str(admin.id),
            username=admin.username,
            nickname=admin.nickname,
            roles=admin.roles,
            permissions=admin.permissions,
        )

    # ── 内部工具 ─────────────────────────────────────────
    async def _find_admin(self, username: str) -> Admin | None:
        stmt = select(Admin).where(Admin.username == username)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def _ensure_demo_admin(self) -> None:
        """确保 demo 管理员存在（开发/测试环境）。

        与 B 端登录页演示账号及 seed.DEMO_ADMINS 保持一致。
        """
        for username, password, nickname, role_key in _DEMO_ADMINS:
            admin = await self._find_admin(username)
            if not admin:
                admin = Admin(
                    username=username,
                    nickname=nickname,
                    password_hash=hash_password(password),
                    role_key=role_key,
                    enabled=1,
                )
                self.session.add(admin)
            else:
                admin.password_hash = hash_password(password)
                admin.nickname = nickname
                admin.role_key = role_key
        await self.session.commit()
