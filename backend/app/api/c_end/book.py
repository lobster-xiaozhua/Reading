"""C 端书籍路由（§7.2）。

对应前端 fetcher：getBook / getChapters / getChapter /
getRelatedBooks / getComments / getRatingDistribution / getCategoryBooks。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_reader, ok
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.repositories.novel_repo import NovelRepository
from app.schemas.common import PagedResult
from app.schemas.enums import SortKey
from app.services._converters import novel_to_c_summary
from app.services.book_service import BookService

router = APIRouter()


@router.get("/books")
async def get_category_books(
    request: Request,
    category: str = Query("all"),
    sort: str = Query("hot"),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """分类页书籍列表。"""
    if sort == SortKey.COMPLETED:
        status = "completed"
    repo = NovelRepository(db)
    novels, total = await repo.list_published(
        category=category, sort=sort, status=status, page=page, page_size=page_size
    )
    items = [novel_to_c_summary(n) for n in novels]
    return ok(request, PagedResult.build(items, total, page, page_size))


@router.get("/books/{book_id}")
async def get_book(
    request: Request,
    book_id: str,
    db: AsyncSession = Depends(get_db),
):
    svc = BookService(db, await get_redis_client())
    return ok(request, await svc.get_book(int(book_id)))


@router.get("/books/{book_id}/chapters")
async def get_chapters(
    request: Request,
    book_id: str,
    db: AsyncSession = Depends(get_db),
):
    svc = BookService(db, await get_redis_client())
    return ok(request, await svc.get_chapters(int(book_id)))


@router.get("/books/{book_id}/chapters/{chapter_id}")
async def get_chapter(
    request: Request,
    book_id: str,
    chapter_id: str,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    """获取章节正文，VIP 章节需校验读者会员状态。"""
    svc = BookService(db, await get_redis_client())
    # 简化：查询读者是否 VIP（demo 环境默认非 VIP）
    reader_vip = False
    return ok(
        request,
        await svc.get_chapter(int(book_id), int(chapter_id), reader_vip=reader_vip),
    )


@router.get("/books/{book_id}/related")
async def get_related_books(
    request: Request,
    book_id: str,
    limit: int = Query(6, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    svc = BookService(db, await get_redis_client())
    return ok(request, await svc.get_related_books(int(book_id), limit))


@router.get("/books/{book_id}/comments")
async def get_comments(
    request: Request,
    book_id: str,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    svc = BookService(db, await get_redis_client())
    return ok(request, await svc.get_comments(int(book_id), limit))


@router.get("/books/{book_id}/rating-distribution")
async def get_rating_distribution(
    request: Request,
    book_id: str,
    db: AsyncSession = Depends(get_db),
):
    svc = BookService(db, await get_redis_client())
    return ok(request, await svc.get_rating_distribution(int(book_id)))
