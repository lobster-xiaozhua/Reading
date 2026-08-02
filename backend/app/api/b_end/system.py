"""B 端系统设置路由。

对应前端 system.getConfig。
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok, require_permission
from app.core.database import get_db
from app.services.system_service import SystemService

router = APIRouter(prefix="/system")


class UpdateConfigBody(BaseModel):
    site_name: str = ""
    icp: str = ""


@router.get("/config")
async def get_config(
    request: Request,
    _admin=Depends(require_permission("system.config")),
    db: AsyncSession = Depends(get_db),
):
    svc = SystemService(db)
    return ok(request, await svc.get_config())


@router.put("/config")
async def update_config(
    request: Request,
    body: UpdateConfigBody,
    _admin=Depends(require_permission("system.config")),
    db: AsyncSession = Depends(get_db),
):
    svc = SystemService(db)
    return ok(request, await svc.update_config(body.site_name, body.icp))
