"""安全工具：JWT 编解码、密码哈希。"""

import os
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.core.config import settings

# 测试环境降低 bcrypt cost factor（4 轮 vs 生产 12 轮），加速认证测试
_TEST_BCRYPT_ROUNDS = int(os.environ.get("BCRYPT_ROUNDS", "12"))
_TEST_MODE = os.environ.get("DEBUG", "false") == "true"


# ── 密码 ────────────────────────────────────────────────
def hash_password(raw: str) -> str:
    """bcrypt 哈希。测试环境使用低 cost factor 加速。"""
    rounds = 4 if _TEST_MODE else 12
    raw_bytes = raw.encode("utf-8")[:72]
    return bcrypt.hashpw(raw_bytes, bcrypt.gensalt(rounds=rounds)).decode("utf-8")


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
