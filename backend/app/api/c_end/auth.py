from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_reader, ok
from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.redis import get_redis_client
from app.core.security import hash_password
from app.models.user import Reader
from app.schemas.auth import RefreshRequest
from app.services.c_auth_service import CAuthService

router = APIRouter(prefix="/auth", tags=["读者鉴权"])


class RegisterBody(BaseModel):
    username: str = Field(..., min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6, max_length=64)
    nickname: str = Field(default="", max_length=64)


class LoginBody(BaseModel):
    username: str
    password: str


@router.post("/register")
async def register(
    request: Request,
    body: RegisterBody,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    from sqlalchemy import select

    existing = (
        await db.execute(select(Reader).where(Reader.username == body.username))
    ).scalar_one_or_none()
    if existing:
        from app.core.exceptions import BizError, ErrorCode

        raise BizError(ErrorCode.PARAM_INVALID, "用户名已存在")

    reader = Reader(
        username=body.username,
        nickname=body.nickname or body.username,
        password_hash=hash_password(body.password),
    )
    db.add(reader)
    await db.commit()
    await db.refresh(reader)

    svc = CAuthService(db, redis)
    res = await svc.register(reader.id, reader.username, reader.nickname, reader.avatar or "")
    return ok(request, res)


@router.post("/login")
@limiter.limit(f"{settings.rate_limit_login}/minute")
async def login(
    request: Request,
    body: LoginBody,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = CAuthService(db, redis)
    res = await svc.login(body.username, body.password)
    return ok(request, res)


@router.post("/refresh")
async def refresh(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = CAuthService(db, redis)
    res = await svc.refresh(body.refresh_token)
    return ok(request, res)


@router.get("/me")
async def get_me(
    request: Request,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    reader = (await db.execute(select(Reader).where(Reader.id == reader_id))).scalar_one_or_none()
    if not reader:
        from app.core.exceptions import BizError, ErrorCode

        raise BizError(ErrorCode.RESOURCE_NOT_FOUND, "用户不存在")
    return ok(
        request,
        {
            "id": str(reader.id),
            "username": reader.username,
            "nickname": reader.nickname,
            "avatar": reader.avatar,
        },
    )
