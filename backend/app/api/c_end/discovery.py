"""C 端发现页路由（§7.1）。

对应前端 fetcher：getBanners / getHotBooks / getFreeLimitedBooks /
getEditorPicks / getRanking / getCategories / getTags / getRecommendations /
getTopics / getBookLists / getReviews。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_reader, ok
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.services.discovery_service import DiscoveryService
from app.services.interaction_service import InteractionService
from app.services.recommend_service import RecommendService

router = APIRouter()


@router.get("/discovery/home")
async def get_discovery_home(
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = DiscoveryService(db, redis)
    return ok(request, await svc.get_home_payload())


@router.get("/banners")
async def get_banners(
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = DiscoveryService(db, redis)
    return ok(request, await svc.get_banners())


@router.get("/books/hot")
async def get_hot_books(
    request: Request,
    limit: int = Query(6, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = DiscoveryService(db, redis)
    return ok(request, await svc.get_hot_books(limit))


@router.get("/books/free-limited")
async def get_free_limited_books(
    request: Request,
    limit: int = Query(6, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = DiscoveryService(db, redis)
    return ok(request, await svc.get_free_limited_books(limit))


@router.get("/books/editor-picks")
async def get_editor_picks(
    request: Request,
    limit: int = Query(6, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = DiscoveryService(db, redis)
    return ok(request, await svc.get_editor_picks(limit))


@router.get("/rankings/{rank_type}")
async def get_ranking(
    request: Request,
    rank_type: str,
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = DiscoveryService(db, redis)
    return ok(request, await svc.get_ranking(rank_type, limit))


@router.get("/categories")
async def get_categories(
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = DiscoveryService(db, redis)
    return ok(request, await svc.get_categories())


@router.get("/tags")
async def get_tags(
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = DiscoveryService(db, redis)
    return ok(request, await svc.get_tags())


@router.get("/recommendations")
async def get_recommendations(
    request: Request,
    limit: int = Query(6, ge=1, le=50),
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = RecommendService(db, redis)
    return ok(request, await svc.get_recommendations(reader_id, limit))


@router.get("/topics")
async def get_topics(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = InteractionService(db, redis)
    return ok(request, await svc.get_topics(limit))


@router.get("/book-lists")
async def get_book_lists(
    request: Request,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = InteractionService(db, redis)
    return ok(request, await svc.get_book_lists(limit))


@router.get("/reviews")
async def get_reviews(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis_client),
):
    svc = InteractionService(db, redis)
    return ok(request, await svc.get_reviews(limit))
