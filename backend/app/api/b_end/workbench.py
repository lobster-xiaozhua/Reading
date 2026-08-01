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
):
    svc = WorkbenchService(db, await get_redis_client())
    return ok(request, await svc.get_kpi())


@router.get("/word-trend")
async def get_word_count_trend(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkbenchService(db, await get_redis_client())
    return ok(request, await svc.get_word_count_trend(days))
