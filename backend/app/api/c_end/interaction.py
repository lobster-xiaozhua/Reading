"""C 端互动路由（§7.6 写操作）。

对应前端写操作：加入/移出书架、上报阅读进度、提交评论、
点赞评论、打赏、评分。
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_reader, ok
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.services.interaction_service import InteractionService

router = APIRouter()


class AddCommentBody(BaseModel):
    content: str = Field(..., min_length=1, description="评论内容")
    rating: int = Field(0, ge=0, le=5, description="评分 1-5，0 表示无评分")


class RewardBody(BaseModel):
    type: str = Field(..., description="ticket/recommend/tip")
    amount: int = Field(..., ge=1, description="打赏金额")


class RatingBody(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="评分 1-5")


class ReadingProgressBody(BaseModel):
    chapter_id: str | None = None
    chapter_index: int | None = None
    percent: float = Field(0.0, ge=0.0, le=100.0)


@router.post("/me/bookshelf/{novel_id}")
async def add_to_bookshelf(
    request: Request,
    novel_id: int,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = InteractionService(db, await get_redis_client())
    return ok(request, await svc.add_to_bookshelf(reader_id, novel_id))


@router.delete("/me/bookshelf/{novel_id}")
async def remove_from_bookshelf(
    request: Request,
    novel_id: int,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = InteractionService(db, await get_redis_client())
    return ok(request, await svc.remove_from_bookshelf(reader_id, novel_id))


@router.post("/me/reading-progress")
async def report_reading_progress(
    request: Request,
    body: ReadingProgressBody,
    novel_id: int = 0,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = InteractionService(db, await get_redis_client())
    return ok(
        request,
        await svc.report_reading_progress(
            reader_id,
            novel_id,
            int(body.chapter_id) if body.chapter_id and body.chapter_id.isdigit() else None,
            body.chapter_index,
            body.percent,
        ),
    )


@router.post("/books/{book_id}/comments")
async def create_comment(
    request: Request,
    book_id: int,
    body: AddCommentBody,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = InteractionService(db, await get_redis_client())
    comment_id = await svc.create_comment(reader_id, book_id, body.content, body.rating)
    return ok(request, {"id": comment_id})


@router.post("/comments/{comment_id}/like")
async def like_comment(
    request: Request,
    comment_id: int,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = InteractionService(db, await get_redis_client())
    return ok(request, await svc.like_comment(comment_id, reader_id))


@router.post("/books/{book_id}/rewards")
async def create_reward(
    request: Request,
    book_id: int,
    body: RewardBody,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = InteractionService(db, await get_redis_client())
    record_id = await svc.create_reward(reader_id, book_id, body.type, body.amount)
    return ok(request, {"id": record_id})


@router.post("/books/{book_id}/rating")
async def submit_rating(
    request: Request,
    book_id: int,
    body: RatingBody,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = InteractionService(db, await get_redis_client())
    return ok(request, await svc.submit_rating(reader_id, book_id, body.rating))
