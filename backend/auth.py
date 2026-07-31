from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, Security
from fastapi.security import APIKeyHeader
from typing import Optional

import db
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
TOKEN_HEADER = APIKeyHeader(name="Authorization", auto_error=False)


def hash_password(password: str) -> str:
    return pwd.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd.verify(plain, hashed)


def create_token(user_id: int, username: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


def register(username: str, password: str):
    existing = db.get_user(username)
    if existing:
        raise HTTPException(status_code=400, detail="username already exists")
    hashed = hash_password(password)
    user = db.create_user(username, hashed)
    token = create_token(user["id"], user["username"])
    from schemas import UserOut, TokenOut
    return TokenOut(token=token, user=UserOut(
        id=user["id"], username=user["username"], created_at=str(user["created_at"]),
    ))


def login(username: str, password: str):
    user = db.get_user(username)
    if not user:
        raise HTTPException(status_code=401, detail="invalid username or password")
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid username or password")
    token = create_token(user["id"], user["username"])
    from schemas import UserOut, TokenOut
    return TokenOut(token=token, user=UserOut(
        id=user["id"], username=user["username"], created_at=str(user["created_at"]),
    ))


async def require_user(token: str = Security(TOKEN_HEADER)):
    if not token:
        raise HTTPException(status_code=401, detail="authorization required")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="invalid or expired token")
    return payload


async def require_admin(token: str = Security(TOKEN_HEADER)):
    if not token:
        raise HTTPException(status_code=401, detail="authorization required")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="invalid or expired token")
    user_id = int(payload["sub"])
    if not db.is_admin(user_id):
        raise HTTPException(status_code=403, detail="admin access required")
    return payload


async def require_admin_optional(token: str = Security(TOKEN_HEADER)):
    """与 require_admin 类似，但认证失败时不抛出异常，返回 None。

    供 require_admin 组合使用，由调用方决定回退逻辑。
    """
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    user_id = int(payload["sub"])
    if not db.is_admin(user_id):
        return None
    return {**payload, "is_admin": True}