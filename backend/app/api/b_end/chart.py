"""B 端图表数据路由（§8.8）。

对应前端 fetchWorkbenchTrend / fetchWordCountGrowth /
fetchReadingHeatmap / fetchReadingFunnel / fetchRankingTrend /
fetchCategoryDistribution / fetchBasicChartData。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, ok
from app.core.database import get_db
from app.services.chart_service import ChartService

router = APIRouter(prefix="/charts")


@router.get("/workbench-trend")
async def get_workbench_trend(
    request: Request,
    range_days: int = Query(7, alias="range", ge=1, le=365),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = ChartService(db)
    return ok(request, await svc.get_workbench_trend(range_days))


@router.get("/word-count-growth")
async def get_word_count_growth(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = ChartService(db)
    return ok(request, await svc.get_word_count_growth(days))


@router.get("/reading-heatmap")
async def get_reading_heatmap(
    request: Request,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = ChartService(db)
    return ok(request, await svc.get_reading_heatmap())


@router.get("/reading-funnel")
async def get_reading_funnel(
    request: Request,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = ChartService(db)
    return ok(request, await svc.get_reading_funnel())


@router.get("/ranking-trend")
async def get_ranking_trend(
    request: Request,
    days: int = Query(14, ge=1, le=90),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = ChartService(db)
    return ok(request, await svc.get_ranking_trend(days))


@router.get("/category-distribution")
async def get_category_distribution(
    request: Request,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = ChartService(db)
    return ok(request, await svc.get_category_distribution())


@router.get("/basic")
async def get_basic_chart(
    request: Request,
    type: str = Query(..., description="图表类型"),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = ChartService(db)
    return ok(request, await svc.get_basic_chart(type))


@router.get("/dashboard")
async def get_dashboard_charts(
    request: Request,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """图表页聚合接口：一次返回全部业务图表数据，减少网络往返。"""
    svc = ChartService(db)
    return ok(request, await svc.get_dashboard_charts())
