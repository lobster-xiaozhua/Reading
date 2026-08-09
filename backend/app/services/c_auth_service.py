"""C 端读者鉴权服务（双 Token 机制）。

access token 8h + refresh token 30d/90d.
"""

import contextlib

import redis.asyncio as redis
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BizError, ErrorCode
from app.core.redis import CacheKeys
from app.core.security import create_token, decode_token, verify_password
from app.models.user import Reader
from app.schemas.auth import CLoginResponse, ReaderUserInfo

logger = structlog.get_logger(__name__)

_LOGIN_FAIL_LIMIT = 5
_LOGIN_LOCK_TTL = 15 * 60
_access_ttl = settings.access_token_ttl
_refresh_ttl = settings.refresh_token_ttl
_refresh_ttl_long = settings.refresh_token_ttl_long


def _make_reader_info(reader: Reader) -> dict:
    """构建读者用户信息 dict，避免重复代码。"""
    return {
        "id": str(reader.id),
        "username": reader.username,
        "nickname": reader.nickname,
        "avatar": reader.avatar or "",
    }


def _create_tokens(reader_id: int, extra: dict, remember: bool = False) -> tuple[str, str, int]:
    """创建双 Token 并返回 (access_token, refresh_token, expires_at_ms)。"""
    access_token, expires_at = create_token(
        reader_id, "access", ttl=_access_ttl, extra=extra
    )
    ttl = _refresh_ttl_long if remember else _refresh_ttl
    refresh_token, _ = create_token(reader_id, "refresh", ttl=ttl, extra=extra)
    return access_token, refresh_token, expires_at


class CAuthService:
    """C 端读者鉴权服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client

    async def login(
        self, username: str, password: str, remember: bool = False, client_ip: str = ""
    ) -> CLoginResponse:
        fail_key = CacheKeys.login_fail(username)
        ip = client_ip or "unknown"
        distinct = int(await self.redis.scard(fail_key) or 0)
        if distinct >= _LOGIN_FAIL_LIMIT:
            raise BizError(ErrorCode.ACCOUNT_LOCKED, "账号已被锁定，请 15 分钟后重试")

        reader = await self._find_reader(username)
        if not reader or not verify_password(password, reader.password_hash):
            await self.redis.sadd(fail_key, ip)
            await self.redis.expire(fail_key, _LOGIN_LOCK_TTL)
            raise BizError(ErrorCode.INVALID_CREDENTIALS, "用户名或密码错误")

        await self.redis.delete(fail_key)

        extra = {"username": reader.username, "nickname": reader.nickname}
        access_token, refresh_token, expires_at = _create_tokens(reader.id, extra, remember)
        await self.redis.set(CacheKeys.access_token(access_token), str(reader.id), ex=_access_ttl)
        await self.redis.set(CacheKeys.refresh_token(refresh_token), str(reader.id), ex=_refresh_ttl_long if remember else _refresh_ttl)

        return CLoginResponse(
            token=access_token,
            user=ReaderUserInfo(**_make_reader_info(reader)),
            expires_at=expires_at,
            refresh_token=refresh_token,
        )

    async def refresh(self, refresh_token: str) -> CLoginResponse:
        try:
            payload = decode_token(refresh_token)
        except Exception as err:
            raise BizError(ErrorCode.TOKEN_EXPIRED, "refresh token 无效") from err

        if payload.get("type") != "refresh":
            raise BizError(ErrorCode.TOKEN_EXPIRED, "token 类型错误")

        cached = await self.redis.get(CacheKeys.refresh_token(refresh_token))
        if not cached:
            raise BizError(ErrorCode.TOKEN_EXPIRED, "会话已失效，请重新登录")

        reader_id = int(cached)
        reader = await self.session.get(Reader, reader_id)
        if not reader:
            raise BizError(ErrorCode.TOKEN_EXPIRED, "用户不存在")

        await self.redis.delete(CacheKeys.refresh_token(refresh_token))

        extra = {"username": reader.username, "nickname": reader.nickname}
        access_token, new_refresh, expires_at = _create_tokens(reader.id, extra, remember=False)
        await self.redis.set(CacheKeys.access_token(access_token), str(reader.id), ex=_access_ttl)
        await self.redis.set(CacheKeys.refresh_token(new_refresh), str(reader.id), ex=_refresh_ttl)

        return CLoginResponse(
            token=access_token,
            user=ReaderUserInfo(**_make_reader_info(reader)),
            expires_at=expires_at,
            refresh_token=new_refresh,
        )

    async def _find_reader(self, username: str) -> Reader | None:
        stmt = select(Reader).where(Reader.username == username)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def logout(self, access_token: str, refresh_token: str | None = None) -> bool:
        """登出：失效 access token 与 refresh token。"""
        with contextlib.suppress(Exception):
            await self.redis.delete(CacheKeys.access_token(access_token))
        if refresh_token:
            with contextlib.suppress(Exception):
                await self.redis.delete(CacheKeys.refresh_token(refresh_token))
        return True

    async def register(self, reader_id: int, username: str, nickname: str, avatar: str) -> CLoginResponse:
        extra = {"username": username, "nickname": nickname}
        access_token, refresh_token, expires_at = _create_tokens(reader_id, extra, remember=False)
        await self.redis.set(CacheKeys.access_token(access_token), str(reader_id), ex=_access_ttl)
        await self.redis.set(CacheKeys.refresh_token(refresh_token), str(reader_id), ex=_refresh_ttl)
        return CLoginResponse(
            token=access_token,
            user=ReaderUserInfo(id=str(reader_id), username=username, nickname=nickname, avatar=avatar),
            expires_at=expires_at,
            refresh_token=refresh_token,
        )
