"""B 端工作台路由（§8.2）。

对应前端 workbench：getKpiCards / getWordCountTrend。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, ok
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.services.workbench_service import WorkbenchService

router = APIRouter(prefix="/workbench")


@router.get("/kpi")
async def get_kpi(
    request: Request,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = WorkbenchService(db, redis)
    return ok(request, await svc.get_kpi())


@router.get("/overviews")
async def get_overviews(
    request: Request,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = WorkbenchService(db, redis)
    return ok(request, await svc.get_overviews())


@router.get("/word-trend")
async def get_word_count_trend(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = WorkbenchService(db, redis)
    return ok(request, await svc.get_word_count_trend(days))


@router.get("/dashboard")
async def get_dashboard(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    """工作台仪表盘聚合接口：一次返回 KPI + 概览 + 趋势，减少网络往返。"""
    svc = WorkbenchService(db, redis)
    return ok(request, await svc.get_dashboard(days))


@router.get("/system-metrics")
async def get_system_metrics(
    request: Request,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    """统一控制面板系统可观测性聚合接口（HTTP / Redis / DB 指标快照）。"""
    svc = WorkbenchService(db, redis)
    return ok(request, await svc.get_system_metrics())
