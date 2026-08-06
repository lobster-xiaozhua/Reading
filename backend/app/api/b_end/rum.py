"""B 端 RUM 可观测性查询接口（前端性能指标 / 运行时错误）。"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok, require_permission
from app.core.database import get_db
from app.services.rum_service import RumService

router = APIRouter(prefix="/rum", tags=["RUM"])


@router.get("/stats")
async def get_rum_stats(
    request: Request,
    hours: int = 24,
    _admin=Depends(require_permission("system.config")),
    db: AsyncSession = Depends(get_db),
):
    """RUM 事件统计（总事件 / 错误数 / LCP 均值 / 类型分组）。"""
    svc = RumService(db)
    return ok(request, await svc.get_stats(hours))


@router.get("/events")
async def get_rum_events(
    request: Request,
    type: str | None = None,
    page: int = 1,
    pageSize: int = 20,
    _admin=Depends(require_permission("system.config")),
    db: AsyncSession = Depends(get_db),
):
    """分页查询 RUM 事件明细。"""
    svc = RumService(db)
    return ok(request, await svc.list_events(type, page, pageSize))
