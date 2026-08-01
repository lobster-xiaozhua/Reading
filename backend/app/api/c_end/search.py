"""C 端搜索路由（§7.4）。

对应前端 fetcher：searchSuggestions / searchBooks / getHotSearches。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.services.search_service import SearchService

router = APIRouter()


@router.get("/search/suggestions")
async def get_search_suggestions(
    request: Request,
    keyword: str = Query("", description="搜索关键词"),
    db: AsyncSession = Depends(get_db),
):
    svc = SearchService(db, await get_redis_client())
    return ok(request, await svc.get_suggestions(keyword))


@router.get("/search/books")
async def search_books(
    request: Request,
    keyword: str = Query("", description="搜索关键词"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    svc = SearchService(db, await get_redis_client())
    return ok(request, await svc.search_books(keyword, page, page_size))


@router.get("/search/hot")
async def get_hot_searches(
    request: Request,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    svc = SearchService(db, await get_redis_client())
    return ok(request, await svc.get_hot_searches(limit))
