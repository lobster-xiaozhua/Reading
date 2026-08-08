"""B 端鉴权路由（§8.1）。

对应前端 auth：login / refresh / logout / getCurrentUser。
"""

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, ok
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.redis import get_redis_client
from app.schemas.auth import LoginCredentials, RefreshRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth")


@router.post("/login")
@limiter.limit(f"{settings.rate_limit_login}/minute")
async def login(
    request: Request,
    body: LoginCredentials,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = AuthService(db, redis)
    res = await svc.login(
        body.username,
        body.password,
        body.remember,
        client_ip=request.client.host if request.client else "",
    )
    return ok(request, res)


@router.post("/refresh")
async def refresh(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = AuthService(db, redis)
    return ok(request, await svc.refresh(body.refresh_token))


@router.post("/logout")
async def logout(
    request: Request,
    body: RefreshRequest | None = None,
    authorization: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = AuthService(db, redis)
    token = authorization.removeprefix("Bearer ").strip()
    refresh_token = body.refresh_token if body else None
    return ok(request, await svc.logout(token, refresh_token))


@router.get("/me")
async def get_current_user(
    request: Request,
    admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = AuthService(db, redis)
    return ok(request, await svc.get_current_user(admin))
