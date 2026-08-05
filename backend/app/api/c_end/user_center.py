"""C 端用户中心路由（§7.5）。

对应前端 fetcher：getCurrentUser / getBookshelf / getReadingHistory /
getRewardRecords / getReadingStatOverview / getHeatmap / getPreferences /
getBadges / getVipPlans / getPaymentMethods / getFollowList。
"""

import time

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_reader, ok
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.services.user_center_service import UserCenterService

router = APIRouter()


@router.get("/me")
async def get_current_user(
    request: Request,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_profile(reader_id))


@router.get("/me/bookshelf")
async def get_bookshelf(
    request: Request,
    tab: str = Query("all"),
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_bookshelf(reader_id, tab))


@router.get("/me/reading-history")
async def get_reading_history(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_reading_history(reader_id, limit))


@router.get("/me/rewards")
async def get_reward_records(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_reward_records(reader_id, limit))


@router.get("/me/stats/overview")
async def get_stats_overview(
    request: Request,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_stats_overview(reader_id))


@router.get("/me/stats/heatmap")
async def get_heatmap(
    request: Request,
    days: int = Query(365, ge=1, le=730),
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_heatmap(reader_id, days))


@router.get("/me/stats/preferences")
async def get_preferences(
    request: Request,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_preferences(reader_id))


@router.get("/me/badges")
async def get_badges(
    request: Request,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_badges(reader_id))


@router.get("/me/follows")
async def get_follow_list(
    request: Request,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_follow_list(reader_id))


@router.post("/me/follows/read-all")
async def read_all_follows(
    request: Request,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    from app.models.novel import Novel
    from app.models.reading import ReadingHistory

    subq = select(ReadingHistory.novel_id).where(ReadingHistory.reader_id == reader_id).subquery()
    stmt = (
        select(Novel.id)
        .where(
            Novel.deleted == 0,
            Novel.status == "published",
            Novel.id.notin_(select(subq.c.novel_id)),
        )
        .limit(100)
    )
    rows = (await db.execute(stmt)).scalars().all()
    updated = 0
    now = int(time.time() * 1000)
    for novel_id in rows:
        db.add(
            ReadingHistory(
                reader_id=reader_id,
                novel_id=novel_id,
                percent=0.0,
                read_at=now,
            )
        )
        updated += 1
    await db.commit()
    return ok(request, {"updatedCount": updated})


@router.get("/vip/plans")
async def get_vip_plans(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_vip_plans())


@router.get("/payment/methods")
async def get_payment_methods(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    svc = UserCenterService(db, await get_redis_client())
    return ok(request, await svc.get_payment_methods())
