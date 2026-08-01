"""B 端系统设置路由。

对应前端 system.getConfig。
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok, require_permission
from app.core.database import get_db
from app.services.system_service import SystemService

router = APIRouter(prefix="/system")


@router.get("/config")
async def get_config(
    request: Request,
    _admin=Depends(require_permission("system.config")),
    db: AsyncSession = Depends(get_db),
):
    svc = SystemService(db)
    return ok(request, await svc.get_config())
