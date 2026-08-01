"""B 端敏感词管理路由（§8.7）。

对应前端 fetchSensitiveWordLib / addSensitiveWord / removeSensitiveWord。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok, require_permission
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.schemas.b_end import AddSensitiveWordBody
from app.services.sensitive_service import SensitiveService

router = APIRouter(prefix="/sensitive-words")


@router.get("")
async def get_sensitive_word_lib(
    request: Request,
    _admin=Depends(require_permission("system.config")),
    db: AsyncSession = Depends(get_db),
):
    svc = SensitiveService(db, await get_redis_client())
    return ok(request, await svc.get_lib())


@router.post("")
async def add_sensitive_word(
    request: Request,
    body: AddSensitiveWordBody,
    _admin=Depends(require_permission("system.config")),
    db: AsyncSession = Depends(get_db),
):
    svc = SensitiveService(db, await get_redis_client())
    return ok(request, await svc.add_word(body))


@router.delete("")
async def remove_sensitive_word(
    request: Request,
    text: str = Query(..., description="敏感词文本"),
    _admin=Depends(require_permission("system.config")),
    db: AsyncSession = Depends(get_db),
):
    svc = SensitiveService(db, await get_redis_client())
    return ok(request, await svc.remove_word(text))
