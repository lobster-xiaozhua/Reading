"""FastAPI 依赖注入：数据库、缓存、当前用户、权限校验。"""

from dataclasses import dataclass, field
from typing import cast

import redis.asyncio as redis
from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.redis import get_redis_client
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
    redis_client: redis.Redis = Depends(get_redis_client),
) -> AdminContext:
    """解析当前登录管理员。

    未携带 token 时降级为 demo 超级管理员（便于前端联调），生产环境必须移除。
    """
    if not authorization or not authorization.startswith("Bearer "):
        request.state.admin = AdminContext(
            id=1,
            username=settings.demo_admin_username,
            nickname="演示管理员",
            roles=["super-admin"],
            permissions=ALL_PERMISSIONS,
        )
        return cast(AdminContext, request.state.admin)

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except Exception as err:
        raise UnauthorizedError("Token 无效或已过期") from err

    if payload.get("type") != "access":
        raise UnauthorizedError("Token 类型错误")

    admin_id_str = payload.get("sub")
    cached = await redis_client.get(f"auth:access:{token}")
    if not cached or cached != admin_id_str:
        raise UnauthorizedError("会话已失效，请重新登录")

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
    redis_client: redis.Redis = Depends(get_redis_client),
) -> int:
    """解析当前登录读者 ID。

    未接入读者登录前使用 demo ID 降级，便于前端联调。
    """
    if not authorization or not authorization.startswith("Bearer "):
        request.state.reader_id = settings.demo_reader_id
        return settings.demo_reader_id

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except Exception as err:
        raise UnauthorizedError("Token 无效或已过期") from err

    if payload.get("type") != "access":
        raise UnauthorizedError("Token 类型错误")

    reader_id_str = payload.get("sub")
    cached = await redis_client.get(f"auth:access:{token}")
    if not cached or cached != reader_id_str:
        raise UnauthorizedError("会话已失效，请重新登录")

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
