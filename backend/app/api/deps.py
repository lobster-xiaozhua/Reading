"""FastAPI 依赖注入：数据库、缓存、当前用户、权限校验。"""

from dataclasses import dataclass, field

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

# 预编译 Bearer 前缀，避免重复调用 startswith
_BEARER_PREFIX = "Bearer "

logger = structlog.get_logger("api.deps")


def _extract_token(authorization: str) -> str | None:
    """提取 Bearer token 字符串，无前缀时返回 None。"""
    if not authorization or not authorization.startswith(_BEARER_PREFIX):
        return None
    return authorization[len(_BEARER_PREFIX):].strip()


def _parse_access_token(authorization: str) -> tuple[str, dict] | None:
    """解析 Bearer access token，返回 (token, payload)；未携带时返回 None。"""
    token = _extract_token(authorization)
    if token is None:
        return None
    try:
        payload = decode_token(token)
    except Exception as err:
        logger.warning("Token decode failed", exc_info=True)
        raise UnauthorizedError("Token 无效或已过期") from err
    if payload.get("type") != "access":
        raise UnauthorizedError("Token 类型错误")
    return token, payload


async def _verify_access_session(token: str, subject: str) -> None:
    """校验 access token 会话有效性（含熔断记账），失败抛 UnauthorizedError。"""
    cb = get_circuit_breaker()
    redis_client = await get_redis_client()
    token_key = f"auth:access:{token}"
    try:
        cached = await redis_client.get(token_key)
        if not cached or cached != subject:
            raise UnauthorizedError("会话已失效，请重新登录")
    except Exception:
        cb.record_failure()
        raise UnauthorizedError("会话校验失败，请重新登录") from None
    cb.record_success()


def ok(request: Request, data=None) -> Response:
    """构造统一成功响应，自动注入 traceId。"""
    resp = Response.ok(data)
    resp.traceId = getattr(getattr(request, "state", None), "trace_id", None)
    return resp


@dataclass
class AdminContext:
    """当前管理员上下文（B 端）。"""

    id: int
    username: str
    nickname: str = ""
    roles: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)


def _demo_admin(request: Request, *, admin_id: int = 1, username: str = "") -> AdminContext:
    """构造 DEBUG 演示管理员上下文。"""
    ctx = AdminContext(
        id=admin_id,
        username=username or settings.demo_admin_username,
        nickname="演示管理员",
        roles=["super-admin"],
        permissions=ALL_PERMISSIONS,
    )
    request.state.admin = ctx
    return ctx


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
    parsed = _parse_access_token(authorization)
    if parsed is None:
        if settings.debug:
            return _demo_admin(request)
        raise UnauthorizedError("未登录或登录已过期")
    token, payload = parsed

    cb = get_circuit_breaker()
    if cb.is_open:
        if settings.debug:
            logger.warning("Redis 熔断，管理员鉴权降级为 demo 模式")
            return _demo_admin(
                request,
                admin_id=int(payload["sub"]) if payload.get("sub") else 1,
                username=payload.get("username", ""),
            )
        raise RuntimeError("服务暂不可用，请稍后重试")

    await _verify_access_session(token, payload.get("sub", ""))

    roles = payload.get("roles", [])
    perms = ALL_PERMISSIONS if "super-admin" in roles else payload.get("permissions", [])
    ctx = AdminContext(
        id=int(payload["sub"]),
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
    parsed = _parse_access_token(authorization)
    if parsed is None:
        if settings.debug:
            request.state.reader_id = settings.demo_reader_id
            return settings.demo_reader_id
        raise UnauthorizedError("未登录或登录已过期")
    token, payload = parsed

    cb = get_circuit_breaker()
    if cb.is_open:
        if settings.debug:
            reader_id = int(payload["sub"]) if payload.get("sub") else settings.demo_reader_id
            request.state.reader_id = reader_id
            logger.warning("Redis 熔断，读者鉴权降级为 demo 模式 reader_id=%s", reader_id)
            return reader_id
        raise RuntimeError("服务暂不可用，请稍后重试")

    await _verify_access_session(token, payload.get("sub", ""))

    reader_id = int(payload["sub"])
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
