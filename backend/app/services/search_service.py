"""C 端搜索服务（§7.4）。

提供搜索建议、书籍搜索、热搜词。
当前实现基于 MySQL LIKE 查询，后续可平替为 Elasticsearch。
"""

import json
import logging

import redis.asyncio as redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import CacheKeys
from app.models.novel import Novel, Tag
from app.repositories.novel_repo import NovelRepository
from app.schemas.c_end import BookSummary, SearchSuggestion
from app.schemas.common import PagedResult
from app.services._converters import novel_to_c_summary
from app.utils.cache import cache_set

logger = logging.getLogger(__name__)

_TTL_SUGGESTION = 60     # 1 分钟
_TTL_HOT_SEARCH = 300    # 5 分钟
_MAX_SUGGESTIONS = 8


class SearchService:
    """搜索聚合服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.novel_repo = NovelRepository(session)

    # ── 搜索建议 ─────────────────────────────────────────
    async def get_suggestions(self, keyword: str) -> list[SearchSuggestion]:
        """获取搜索建议（书名/作者/标签匹配）。

        Args:
            keyword: 搜索关键词。

        Returns:
            搜索建议列表。
        """
        if not keyword or not keyword.strip():
            return []

        keyword = keyword.strip()
        key = CacheKeys.search_suggestion(keyword)
        cached = await self.redis.get(key)
        if cached:
            return [SearchSuggestion.model_validate(s) for s in json.loads(cached)]

        suggestions: list[SearchSuggestion] = []
        # 书名匹配
        novels = await self.novel_repo.search(keyword, limit=3)
        for n in novels:
            suggestions.append(
                SearchSuggestion(type="book", text=n.title, book_id=str(n.id))
            )
        # 作者名匹配
        author_stmt = (
            select(Novel.author_name)
            .where(
                Novel.deleted == 0,
                Novel.status == "published",
                Novel.author_name.contains(keyword),
            )
            .distinct()
            .limit(3)
        )
        for name in (await self.session.execute(author_stmt)).scalars().all():
            suggestions.append(SearchSuggestion(type="author", text=name))
        # 标签匹配
        tag_stmt = (
            select(Tag.name)
            .where(Tag.name.contains(keyword))
            .limit(2)
        )
        for name in (await self.session.execute(tag_stmt)).scalars().all():
            suggestions.append(SearchSuggestion(type="tag", text=name))

        result = suggestions[:_MAX_SUGGESTIONS]
        await self._cache_set(key, result, _TTL_SUGGESTION)
        return result

    # ── 书籍搜索 ─────────────────────────────────────────
    async def search_books(
        self, keyword: str, page: int = 1, page_size: int = 12
    ) -> PagedResult[BookSummary]:
        """搜索书籍，按点击量排序。

        Args:
            keyword: 搜索关键词。
            page: 页码。
            page_size: 每页数量。

        Returns:
            分页书籍搜索结果。
        """
        novels, total = await self._search_novels(keyword, page, page_size)
        items = [novel_to_c_summary(n) for n in novels]
        # 记录搜索词频
        await self._record_search(keyword)
        return PagedResult.build(items, total, page, page_size)

    # ── 热搜词 ──────────────────────────────────────────
    async def get_hot_searches(self, limit: int = 10) -> list[str]:
        """获取热搜词列表（基于 Redis ZSet）。

        Args:
            limit: 返回数量限制。

        Returns:
            热搜词列表。
        """
        cached = await self.redis.get(CacheKeys.HOT_SEARCHES)
        if cached:
            return json.loads(cached)

        # 从 ZSet 取 Top N
        try:
            hot = await self.redis.zrevrange(CacheKeys.SEARCH_HOT_ZSET, 0, limit - 1)
            result = [h for h in hot if h]
        except Exception:
            result = []
        await self._cache_set(CacheKeys.HOT_SEARCHES, result, _TTL_HOT_SEARCH)
        return result

    # ── 内部工具 ─────────────────────────────────────────
    async def _search_novels(
        self, keyword: str, page: int, page_size: int
    ) -> tuple[list[Novel], int]:
        if not keyword or not keyword.strip():
            return [], 0
        keyword = keyword.strip()
        stmt = (
            select(Novel)
            .where(
                Novel.deleted == 0,
                Novel.status == "published",
                Novel.title.contains(keyword),
            )
            .order_by(Novel.click_count.desc())
        )
        # 若标题搜索结果不足，补充作者名匹配
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()
        if total == 0:
            stmt = (
                select(Novel)
                .where(
                    Novel.deleted == 0,
                    Novel.status == "published",
                    Novel.author_name.contains(keyword),
                )
                .order_by(Novel.click_count.desc())
            )
            count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
            total = (await self.session.execute(count_stmt)).scalar_one()
        result = await self.session.execute(
            stmt.offset((page - 1) * page_size).limit(page_size)
        )
        return list(result.scalars().all()), total

    async def _record_search(self, keyword: str) -> None:
        try:
            await self.redis.zincrby(CacheKeys.SEARCH_HOT_ZSET, 1.0, keyword)
        except Exception:
            logger.debug("搜索词频记录失败 keyword=%s", keyword, exc_info=True)

    async def _cache_set(self, key: str, data: list, ttl: int) -> None:
        await cache_set(self.redis, key, data, ttl)
