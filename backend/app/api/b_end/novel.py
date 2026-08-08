"""B 端作品管理路由（§8.3）。

对应前端 fetchNovelList / fetchNovelDetail / submitNovel /
batchOperate / submitForAudit / approveNovel / shelveNovel / reshelveNovel。
"""

import time

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, ok, require_permission
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.models.audit import AuditHistory as AuditHistoryModel
from app.models.audit import AuditRecord as AuditRecordModel
from app.models.interaction import Comment as CommentModel
from app.models.novel import Novel as NovelModel
from app.models.reading import ReadingHistory
from app.schemas.b_end import (
    AuditHistoryItem,
    NovelBatchOperateBody,
    NovelListParams,
    NovelSubmitBody,
)
from app.services.novel_service import NovelService

router = APIRouter(prefix="/novels")


@router.get("")
async def list_novels(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search_key: str = Query(""),
    status: str = Query("all"),
    category: str = Query("all"),
    date_range: list[int] | None = Query(None),
    _admin=Depends(require_permission("novel.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db)
    params = NovelListParams(
        page=page,
        page_size=page_size,
        search_key=search_key,
        status=status,
        category=category,
        date_range=date_range,
    )
    return ok(request, await svc.list_novels(params))


@router.get("/{novel_id}")
async def get_novel_detail(
    request: Request,
    novel_id: int,
    _admin=Depends(require_permission("novel.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db)
    return ok(request, await svc.get_detail(novel_id))


@router.post("")
async def submit_novel(
    request: Request,
    body: NovelSubmitBody,
    redis = Depends(get_redis_client),
    _admin=Depends(require_permission("novel.create")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db, redis)
    return ok(request, await svc.submit_novel(body))


@router.put("/{novel_id}")
async def update_novel(
    request: Request,
    novel_id: int,
    body: NovelSubmitBody,
    redis = Depends(get_redis_client),
    _admin=Depends(require_permission("novel.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db, redis)
    return ok(request, await svc.submit_novel(body, novel_id))


@router.post("/batch-operate")
async def batch_operate(
    request: Request,
    body: NovelBatchOperateBody,
    redis = Depends(get_redis_client),
    _admin=Depends(require_permission("novel.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db, redis)
    result = await svc.batch_result(body.ids, body.action, body.reason, body.comment)
    return ok(request, result)


@router.post("/submit-audit")
async def submit_for_audit(
    request: Request,
    body: NovelBatchOperateBody,
    redis = Depends(get_redis_client),
    _admin=Depends(require_permission("novel.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db, redis)
    result = await svc.batch_result(body.ids, "submit-audit")
    return ok(request, result)


@router.post("/approve")
async def approve_novel(
    request: Request,
    body: NovelBatchOperateBody,
    redis = Depends(get_redis_client),
    _admin=Depends(require_permission("audit.approve")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db, redis)
    result = await svc.batch_result(body.ids, "approve")
    return ok(request, result)


@router.post("/shelve")
async def shelve_novel(
    request: Request,
    body: NovelBatchOperateBody,
    redis = Depends(get_redis_client),
    _admin=Depends(require_permission("novel.shelve")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db, redis)
    result = await svc.batch_result(body.ids, "shelve", body.reason, body.comment)
    return ok(request, result)


@router.post("/reshelve")
async def reshelve_novel(
    request: Request,
    body: NovelBatchOperateBody,
    redis = Depends(get_redis_client),
    _admin=Depends(require_permission("novel.shelve")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db, redis)
    result = await svc.batch_result(body.ids, "reshelve")
    return ok(request, result)


@router.get("/{novel_id}/stats")
async def get_novel_stats(
    request: Request,
    novel_id: int,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):

    novel = await db.get(NovelModel, novel_id)
    if not novel:
        return ok(
            request,
            {
                "readCount": 0,
                "favCount": 0,
                "ticketCount": 0,
                "rating": 0,
                "completionRate": 0,
            },
        )

    from sqlalchemy import func

    total_readers = await db.scalar(
        select(func.count())
        .select_from(ReadingHistory)
        .where(ReadingHistory.novel_id == novel_id, ReadingHistory.percent > 0)
    )
    completed_readers = await db.scalar(
        select(func.count())
        .select_from(ReadingHistory)
        .where(ReadingHistory.novel_id == novel_id, ReadingHistory.percent >= 100)
    )
    completion_rate = round(
        (completed_readers / total_readers * 100) if total_readers and total_readers > 0 else 0, 2
    )

    return ok(
        request,
        {
            "readCount": novel.click_count or 0,
            "favCount": novel.follow_count or 0,
            "ticketCount": max(0, (novel.click_count or 0) // 50),
            "rating": float(novel.rating or 0),
            "completionRate": completion_rate,
        },
    )


@router.get("/{novel_id}/audit-history")
async def get_novel_audit_history(
    request: Request,
    novel_id: int,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    subq = select(AuditRecordModel.id).where(AuditRecordModel.target_id == novel_id).subquery()
    stmt = (
        select(AuditHistoryModel)
        .where(AuditHistoryModel.audit_record_id.in_(select(subq.c.id)))
        .order_by(AuditHistoryModel.created_at.desc())
        .limit(20)
    )
    rows = (await db.execute(stmt)).scalars().all()
    items = [
        AuditHistoryItem(
            id=str(r.id),
            operator_name=r.operator_name,
            result=r.result,
            comment=r.comment,
            reject_reason=r.reject_reason,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return ok(request, items)


@router.get("/{novel_id}/comments")
async def get_novel_comments(
    request: Request,
    novel_id: int,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CommentModel)
        .where(
            CommentModel.novel_id == novel_id,
            CommentModel.status == 1,
            CommentModel.deleted == 0,
        )
        .order_by(CommentModel.likes.desc())
        .limit(10)
    )
    rows = (await db.execute(stmt)).scalars().all()
    items = [
        {
            "id": str(r.id),
            "user": f"读者{r.reader_id}",
            "content": r.content,
            "time": f"{max(1, (int(time.time() * 1000) - r.created_at) // 3600000)} 小时前"
            if r.created_at
            else "未知",
            "likes": r.likes,
        }
        for r in rows
    ]
    return ok(request, items)
