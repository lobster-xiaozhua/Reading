"""安全工具：JWT 编解码、密码哈希。"""

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.core.config import settings


# ── 密码 ────────────────────────────────────────────────
def hash_password(raw: str) -> str:
    """bcrypt 哈希。"""
    # bcrypt 限制 72 字节，超长截断
    raw_bytes = raw.encode("utf-8")[:72]
    return bcrypt.hashpw(raw_bytes, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(raw: str, hashed: str) -> bool:
    """校验密码。"""
    raw_bytes = raw.encode("utf-8")[:72]
    hashed_bytes = hashed.encode("utf-8")
    return bcrypt.checkpw(raw_bytes, hashed_bytes)


# ── JWT ─────────────────────────────────────────────────
def create_token(
    subject: str | int,
    token_type: str = "access",
    ttl: int | None = None,
    extra: dict[str, Any] | None = None,
) -> tuple[str, int]:
    """生成 JWT，返回 (token, 过期时间戳 ms)。"""
    if ttl is None:
        ttl = settings.access_token_ttl if token_type == "access" else settings.refresh_token_ttl

    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=ttl)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    if extra:
        payload.update(extra)

    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, int(expires_at.timestamp() * 1000)


def decode_token(token: str) -> dict[str, Any]:
    """解码并校验 JWT，失败抛异常。"""
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
