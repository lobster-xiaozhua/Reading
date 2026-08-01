"""C 端发现页服务（§7.1）。

聚合 Banner、热门、限免、编辑推荐、排行榜、分类树、标签云，
全部走 Cache-Aside 策略，缓存命中直接返回，未命中回查库并回填。
"""

import json
import logging

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import CacheKeys
from app.models.novel import Banner as BannerModel
from app.models.novel import Category, Novel
from app.repositories.novel_repo import NovelRepository
from app.schemas.c_end import Banner, BookSummary, CategoryNode, RankItem, RecommendBook, TagItem
from app.services._converters import novel_to_c_summary

logger = logging.getLogger(__name__)

# 缓存 TTL（秒）
_TTL_BANNERS = 300          # 5 分钟
_TTL_HOT_BOOKS = 300
_TTL_FREE_LIMITED = 300
_TTL_EDITOR_PICKS = 300
_TTL_RANKING = 600           # 10 分钟
_TTL_CATEGORIES = 3600
_TTL_TAGS = 3600


class DiscoveryService:
    """发现页聚合服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.novel_repo = NovelRepository(session)

    # ── Banner ──────────────────────────────────────────
    async def get_banners(self) -> list[Banner]:
        cached = await self.redis.get(CacheKeys.BANNERS)
        if cached:
            return [Banner.model_validate(b) for b in json.loads(cached)]

        banners = await self.novel_repo.get_banners()
        result = [_banner_to_schema(b) for b in banners]
        await self._cache_set(CacheKeys.BANNERS, result, _TTL_BANNERS)
        return result

    # ── 热门 / 限免 / 编辑推荐 ────────────────────────────
    async def get_hot_books(self, limit: int = 6) -> list[BookSummary]:
        return await self._get_flag_books(CacheKeys.HOT_BOOKS, "hot", limit, _TTL_HOT_BOOKS)

    async def get_free_limited_books(self, limit: int = 6) -> list[BookSummary]:
        return await self._get_flag_books(
            CacheKeys.FREE_LIMITED, "free-limited", limit, _TTL_FREE_LIMITED
        )

    async def get_editor_picks(self, limit: int = 6) -> list[RecommendBook]:
        cached = await self.redis.get(CacheKeys.EDITOR_PICKS)
        if cached:
            return [RecommendBook.model_validate(r) for r in json.loads(cached)]

        novels = await self.novel_repo.by_flag("editor-pick", limit)
        result = [
            RecommendBook(book=novel_to_c_summary(n), match_score=_match_score(n))
            for n in novels
        ]
        await self._cache_set(CacheKeys.EDITOR_PICKS, result, _TTL_EDITOR_PICKS)
        return result

    # ── 排行榜 ──────────────────────────────────────────
    async def get_ranking(self, rank_type: str, limit: int = 100) -> list[RankItem]:
        key = CacheKeys.rank(rank_type)
        cached = await self.redis.get(key)
        if cached:
            return [RankItem.model_validate(r) for r in json.loads(cached)]

        novels = await self.novel_repo.ranking(rank_type, limit)
        result = [
            RankItem(book=novel_to_c_summary(n), rank=i + 1, prev_rank=i + 1)
            for i, n in enumerate(novels)
        ]
        await self._cache_set(key, result, _TTL_RANKING)
        return result

    # ── 分类树 ──────────────────────────────────────────
    async def get_categories(self) -> list[CategoryNode]:
        cached = await self.redis.get(CacheKeys.CATEGORIES)
        if cached:
            return [CategoryNode.model_validate(c) for c in json.loads(cached)]

        categories = await self.novel_repo.get_categories()
        result = _build_category_tree(categories)
        await self._cache_set(CacheKeys.CATEGORIES, result, _TTL_CATEGORIES)
        return result

    # ── 标签云 ──────────────────────────────────────────
    async def get_tags(self) -> list[TagItem]:
        cached = await self.redis.get(CacheKeys.TAGS)
        if cached:
            return [TagItem.model_validate(t) for t in json.loads(cached)]

        tags = await self.novel_repo.get_tags()
        result = [
            TagItem(id=str(t.id), name=t.name, count=t.ref_count) for t in tags
        ]
        await self._cache_set(CacheKeys.TAGS, result, _TTL_TAGS)
        return result

    # ── 推荐书单 ─────────────────────────────────────────
    async def get_recommendations(self, limit: int = 6) -> list[RecommendBook]:
        """基于编辑推荐 + 高评分生成推荐列表。"""
        novels = await self.novel_repo.ranking("hot", limit)
        return [
            RecommendBook(book=novel_to_c_summary(n), match_score=_match_score(n))
            for n in novels
        ]

    # ── 内部工具 ─────────────────────────────────────────
    async def _get_flag_books(
        self, cache_key: str, flag: str, limit: int, ttl: int
    ) -> list[BookSummary]:
        cached = await self.redis.get(cache_key)
        if cached:
            return [BookSummary.model_validate(b) for b in json.loads(cached)]

        novels = await self.novel_repo.by_flag(flag, limit)
        result = [novel_to_c_summary(n) for n in novels]
        await self._cache_set(cache_key, result, ttl)
        return result

    async def _cache_set(self, key: str, data: list, ttl: int) -> None:
        try:
            await self.redis.set(key, json.dumps(data, default=str), ex=ttl)
        except Exception:
            logger.warning("缓存写入失败 key=%s", key, exc_info=True)


def _banner_to_schema(b: BannerModel) -> Banner:
    return Banner(
        id=str(b.id),
        book_id=b.book_id,
        title=b.title,
        subtitle=b.subtitle,
        cover=b.cover,
        accent=b.accent,
    )


def _build_category_tree(categories: list[Category]) -> list[CategoryNode]:
    """构建一级/二级分类树。"""
    nodes: dict[int, CategoryNode] = {
        c.id: CategoryNode(
            id=str(c.id),
            name=c.name,
            icon=c.icon,
            count=c.novel_count,
            children=[],
        )
        for c in categories
    }
    roots: list[CategoryNode] = []
    for c in categories:
        node = nodes[c.id]
        if c.parent_id and c.parent_id in nodes:
            nodes[c.parent_id].children.append(node)  # type: ignore[arg-type]
        else:
            roots.append(node)
    # 空子节点置 None，对齐前端可选字段
    for node in roots:
        if not node.children:
            node.children = None
    return roots


def _match_score(novel: Novel) -> int:
    """根据评分与点击量估算匹配度（0-100）。"""
    score = int(min(novel.rating * 18, 90))
    if novel.click_count > 10000:
        score += 10
    return min(score, 100)
