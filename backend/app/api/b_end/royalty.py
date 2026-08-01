"""B 端稿费管理路由（§8.6）。

对应前端 fetchRoyaltyList / batchSettle / markWithdrawn。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok, require_permission
from app.core.database import get_db
from app.schemas.royalty import BatchSettleParams
from app.services.royalty_service import RoyaltyService

router = APIRouter(prefix="/royalties")


@router.get("")
async def list_royalties(
    request: Request,
    month: str | None = Query(None),
    status: str = Query("all"),
    author_name: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin=Depends(require_permission("royalty.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = RoyaltyService(db)
    return ok(
        request,
        await svc.list_royalties(month, status, author_name, page, page_size),
    )


@router.post("/batch-settle")
async def batch_settle(
    request: Request,
    body: BatchSettleParams,
    _admin=Depends(require_permission("royalty.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = RoyaltyService(db)
    return ok(request, await svc.batch_settle(body.ids))


@router.post("/mark-withdrawn")
async def mark_withdrawn(
    request: Request,
    body: BatchSettleParams,
    _admin=Depends(require_permission("royalty.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = RoyaltyService(db)
    return ok(request, await svc.mark_withdrawn(body.ids))
