"""FastAPI 依赖注入：数据库、缓存、当前用户、权限校验。"""

from dataclasses import dataclass, field
from typing import cast

import structlog
from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.redis import get_circuit_breaker, get_redis_client
from app.core.security import decode_token
from app.schemas.common import Response
from app.schemas.enums import ALL_PERMISSIONS


def ok(request: Request, data=None) -> Response:
    """构造统一成功响应，自动注入 traceId。"""
    resp = Response.ok(data)
    resp.traceId = getattr(request.state, "trace_id", None)
    return resp


@dataclass
class AdminContext:
    """当前管理员上下文（B 端）。"""

    id: int
    username: str
    nickname: str = ""
    roles: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)


async def get_current_admin(
    request: Request,
    authorization: str = Header(default="", description="Bearer token"),
    db: AsyncSession = Depends(get_db),
) -> AdminContext:
    """解析当前登录管理员。

    未携带 token 时仅在 DEBUG 模式下降级为 demo 超级管理员（便于前端联调），
    生产环境强制校验 token。
    熔断器 OPEN 时降级为 demo 模式（可用性优先于强一致性）。
    """
    if not authorization or not authorization.startswith("Bearer "):
        if settings.debug:
            request.state.admin = AdminContext(
                id=1,
                username=settings.demo_admin_username,
                nickname="演示管理员",
                roles=["super-admin"],
                permissions=ALL_PERMISSIONS,
            )
            return cast(AdminContext, request.state.admin)
        raise UnauthorizedError("未登录或登录已过期")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except Exception as err:
        logger = structlog.get_logger("api.deps")
        logger.warning("Token decode failed", exc_info=True)
        raise UnauthorizedError("Token 无效或已过期") from err

    if payload.get("type") != "access":
        raise UnauthorizedError("Token 类型错误")

    admin_id_str = payload.get("sub")
    cb = get_circuit_breaker()
    if cb.is_open:
        # 熔断器 OPEN：Redis 不可用，降级为 demo 模式（可用性优先）
        if settings.debug:
            request.state.admin = AdminContext(
                id=int(admin_id_str) if admin_id_str else 1,
                username=payload.get("username", settings.demo_admin_username),
                roles=["super-admin"],
                permissions=ALL_PERMISSIONS,
            )
            logger.warning("Redis 熔断，鉴权降级为 demo 模式")
            return cast(AdminContext, request.state.admin)
        # 生产环境熔断时仍要求 Redis，拒绝请求
        raise RuntimeError("服务暂不可用，请稍后重试")

    redis_client = await get_redis_client()
    try:
        cached = await redis_client.get(f"auth:access:{token}")
        if not cached or cached != admin_id_str:
            raise UnauthorizedError("会话已失效，请重新登录")
        cb.record_success()
    except Exception:
        cb.record_failure()
        raise UnauthorizedError("会话校验失败，请重新登录") from None

    roles = payload.get("roles", [])
    perms = ALL_PERMISSIONS if "super-admin" in roles else payload.get("permissions", [])
    ctx = AdminContext(
        id=int(admin_id_str),
        username=payload.get("username", ""),
        nickname=payload.get("nickname", ""),
        roles=roles,
        permissions=perms,
    )
    request.state.admin = ctx
    return ctx


async def get_current_reader(
    request: Request,
    authorization: str = Header(default="", description="Bearer token"),
) -> int:
    """解析当前登录读者 ID。

    未携带 token 时仅在 DEBUG 模式下降级为 demo 读者（便于前端联调），
    生产环境强制校验 token。
    熔断器 OPEN 时降级为 demo 模式（可用性优先于强一致性）。
    """
    if not authorization or not authorization.startswith("Bearer "):
        if settings.debug:
            request.state.reader_id = settings.demo_reader_id
            return settings.demo_reader_id
        raise UnauthorizedError("未登录或登录已过期")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except Exception as err:
        logger = structlog.get_logger("api.deps")
        logger.warning("Token decode failed", exc_info=True)
        raise UnauthorizedError("Token 无效或已过期") from err

    if payload.get("type") != "access":
        raise UnauthorizedError("Token 类型错误")

    reader_id_str = payload.get("sub")
    cb = get_circuit_breaker()
    if cb.is_open:
        # 熔断器 OPEN：降级为 demo 读者（可用性优先）
        if settings.debug:
            reader_id = int(reader_id_str) if reader_id_str else settings.demo_reader_id
            request.state.reader_id = reader_id
            logger.warning("Redis 熔断，读者鉴权降级为 demo 模式 reader_id=%s", reader_id)
            return reader_id
        raise RuntimeError("服务暂不可用，请稍后重试")

    redis_client = await get_redis_client()
    try:
        cached = await redis_client.get(f"auth:access:{token}")
        if not cached or cached != reader_id_str:
            raise UnauthorizedError("会话已失效，请重新登录")
        cb.record_success()
    except Exception:
        cb.record_failure()
        raise UnauthorizedError("会话校验失败，请重新登录") from None

    reader_id = int(reader_id_str)
    request.state.reader_id = reader_id
    return reader_id


def require_permission(perm: str):
    """权限校验依赖工厂（操作级，§6.3）。

    super-admin 放行；其余角色校验 permissions 列表。
    """

    async def _checker(admin: AdminContext = Depends(get_current_admin)) -> AdminContext:
        if "super-admin" in admin.roles or perm in admin.permissions:
            return admin
        raise ForbiddenError(f"缺少权限: {perm}")

    return _checker
