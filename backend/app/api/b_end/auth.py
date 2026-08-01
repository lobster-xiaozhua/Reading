"""B 端鉴权路由（§8.1）。

对应前端 auth：login / refresh / logout / getCurrentUser。
"""

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, ok
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.schemas.auth import LoginCredentials, RefreshRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth")


@router.post("/login")
async def login(
    request: Request,
    body: LoginCredentials,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db, await get_redis_client())
    return ok(request, await svc.login(body.username, body.password, body.remember))


@router.post("/refresh")
async def refresh(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db, await get_redis_client())
    return ok(request, await svc.refresh(body.refresh_token))


@router.post("/logout")
async def logout(
    request: Request,
    authorization: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db, await get_redis_client())
    token = authorization.removeprefix("Bearer ").strip()
    return ok(request, await svc.logout(token))


@router.get("/me")
async def get_current_user(
    request: Request,
    admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db, await get_redis_client())
    return ok(request, await svc.get_current_user(admin))
