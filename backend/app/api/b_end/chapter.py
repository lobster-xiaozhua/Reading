"""B 端章节管理路由（§8.4）。

对应前端 fetchChapterList / fetchChapterDetail / createChapter /
updateChapter / reorderChapters / transitionChapterStatus /
batchOperateChapters / deleteChapter。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok, require_permission
from app.core.database import get_db
from app.schemas.b_end import (
    ChapterBatchOperateBody,
    ChapterReorderBody,
    ChapterSubmitBody,
    ChapterTransitionBody,
    ChapterUpdateBody,
)
from app.services.chapter_service import ChapterService

router = APIRouter()


@router.get("/novels/{novel_id}/chapters")
async def list_chapters(
    request: Request,
    novel_id: int,
    _admin=Depends(require_permission("chapter.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = ChapterService(db)
    return ok(request, await svc.list_chapters(novel_id))


@router.get("/chapters/{chapter_id}")
async def get_chapter_detail(
    request: Request,
    chapter_id: int,
    _admin=Depends(require_permission("chapter.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = ChapterService(db)
    return ok(request, await svc.get_detail(chapter_id))


@router.post("/chapters")
async def create_chapter(
    request: Request,
    body: ChapterSubmitBody,
    _admin=Depends(require_permission("chapter.create")),
    db: AsyncSession = Depends(get_db),
):
    svc = ChapterService(db)
    return ok(request, await svc.create_chapter(body))


@router.patch("/chapters/{chapter_id}")
async def update_chapter(
    request: Request,
    chapter_id: int,
    body: ChapterUpdateBody,
    _admin=Depends(require_permission("chapter.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = ChapterService(db)
    return ok(request, await svc.update_chapter(chapter_id, body))


@router.post("/novels/{novel_id}/chapters/reorder")
async def reorder_chapters(
    request: Request,
    novel_id: int,
    body: ChapterReorderBody,
    _admin=Depends(require_permission("chapter.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = ChapterService(db)
    return ok(request, await svc.reorder_chapters(novel_id, body))


@router.post("/chapters/{chapter_id}/transition")
async def transition_chapter(
    request: Request,
    chapter_id: int,
    body: ChapterTransitionBody,
    _admin=Depends(require_permission("chapter.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = ChapterService(db)
    return ok(request, await svc.transition(chapter_id, body))


@router.post("/chapters/batch-operate")
async def batch_operate_chapters(
    request: Request,
    body: ChapterBatchOperateBody,
    _admin=Depends(require_permission("chapter.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = ChapterService(db)
    return ok(request, await svc.batch_operate(body))


@router.delete("/chapters/{chapter_id}")
async def delete_chapter(
    request: Request,
    chapter_id: int,
    title_match: str = Query("", description="已发布章节需标题匹配"),
    _admin=Depends(require_permission("chapter.delete")),
    db: AsyncSession = Depends(get_db),
):
    svc = ChapterService(db)
    return ok(request, await svc.delete_chapter(chapter_id, title_match))
