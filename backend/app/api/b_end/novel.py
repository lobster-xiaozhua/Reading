"""B 端作品管理路由（§8.3）。

对应前端 fetchNovelList / fetchNovelDetail / submitNovel /
batchOperate / submitForAudit / approveNovel / shelveNovel / reshelveNovel。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok, require_permission
from app.core.database import get_db
from app.schemas.b_end import (
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
    novel_id: str,
    _admin=Depends(require_permission("novel.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db)
    return ok(request, await svc.get_detail(int(novel_id)))


@router.post("")
async def submit_novel(
    request: Request,
    body: NovelSubmitBody,
    _admin=Depends(require_permission("novel.create")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db)
    return ok(request, await svc.submit_novel(body))


@router.put("/{novel_id}")
async def update_novel(
    request: Request,
    novel_id: str,
    body: NovelSubmitBody,
    _admin=Depends(require_permission("novel.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db)
    return ok(request, await svc.submit_novel(body, int(novel_id)))


@router.post("/batch-operate")
async def batch_operate(
    request: Request,
    body: NovelBatchOperateBody,
    _admin=Depends(require_permission("novel.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db)
    result = await svc.batch_result(body.ids, body.action, body.reason, body.comment)
    return ok(request, result)


@router.post("/submit-audit")
async def submit_for_audit(
    request: Request,
    body: NovelBatchOperateBody,
    _admin=Depends(require_permission("novel.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db)
    result = await svc.batch_result(body.ids, "submit-audit")
    return ok(request, result)


@router.post("/approve")
async def approve_novel(
    request: Request,
    body: NovelBatchOperateBody,
    _admin=Depends(require_permission("audit.approve")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db)
    result = await svc.batch_result(body.ids, "approve")
    return ok(request, result)


@router.post("/shelve")
async def shelve_novel(
    request: Request,
    body: NovelBatchOperateBody,
    _admin=Depends(require_permission("novel.shelve")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db)
    result = await svc.batch_result(body.ids, "shelve", body.reason, body.comment)
    return ok(request, result)


@router.post("/reshelve")
async def reshelve_novel(
    request: Request,
    body: NovelBatchOperateBody,
    _admin=Depends(require_permission("novel.shelve")),
    db: AsyncSession = Depends(get_db),
):
    svc = NovelService(db)
    result = await svc.batch_result(body.ids, "reshelve")
    return ok(request, result)
