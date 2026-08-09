"""C 端搜索服务（§7.4）。

提供搜索建议、书籍搜索、热搜词。
当前实现基于 MySQL LIKE 查询 + 拼音兜底，后续可平替为 Elasticsearch。
"""

import contextlib
import json

import redis.asyncio as redis
import structlog
from pypinyin import lazy_pinyin
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import CacheKeys
from app.models.novel import Novel, Tag
from app.repositories.novel_repo import NovelRepository
from app.schemas.c_end import BookSummary, SearchSuggestion
from app.schemas.common import PagedResult
from app.services._converters import novel_to_c_summary
from app.utils.cache import cache_set

logger = structlog.get_logger(__name__)

_TTL_SUGGESTION = 60  # 1 分钟
_TTL_HOT_SEARCH = 300  # 5 分钟
_MAX_SUGGESTIONS = 8
_PINYIN_CANDIDATES = 500  # 拼音兜底扫描的候选作品上限（按点击量取 Top N）


def _to_pinyin(text: str) -> str:
    """转全拼小写（无分隔符），用于拼音匹配。"""
    return "".join(lazy_pinyin(text)).lower()


def _pinyin_match(novels: list[Novel], keyword: str) -> list[Novel]:
    """按书名全拼匹配（keyword 需为纯拼音，否则返回空）。

    用于用户输入拼音时兜底命中中文书名，例如 "xuanhuan" 命中 "玄幻之巅"。
    """
    kw = keyword.strip().lower()
    if not kw or not (kw.isascii() and kw.isalpha()):
        return []
    return [n for n in novels if kw in _to_pinyin(n.title)]


class SearchService:
    """搜索聚合服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.novel_repo = NovelRepository(session)

    # ── 搜索建议 ─────────────────────────────────────────
    _TTL_PINYIN_CANDIDATES = 600  # 拼音候选集缓存 10 分钟

    async def get_suggestions(self, keyword: str) -> list[SearchSuggestion]:
        """获取搜索建议（书名/作者/标签匹配），3 路查询顺序执行。

        AsyncSession 不支持并发复用同一连接，故书名/作者/标签查询按序执行。

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

        # 3 路并发：书名、作者、标签
        async def search_books():
            novels = await self.novel_repo.search(keyword, limit=3)
            return [
                SearchSuggestion(type="book", text=n.title, book_id=str(n.id))
                for n in novels
            ]

        async def search_authors():
            stmt = (
                select(Novel.author_name)
                .where(
                    Novel.deleted == 0,
                    Novel.status == "published",
                    Novel.author_name.contains(keyword),
                )
                .distinct()
                .limit(3)
            )
            return [
                SearchSuggestion(type="author", text=name)
                for name in (await self.session.execute(stmt)).scalars().all()
            ]

        async def search_tags():
            stmt = select(Tag.name).where(Tag.name.contains(keyword)).limit(2)
            return [
                SearchSuggestion(type="tag", text=name)
                for name in (await self.session.execute(stmt)).scalars().all()
            ]

        book_res = await search_books()
        author_res = await search_authors()
        tag_res = await search_tags()

        suggestions = list(book_res)
        # 拼音兜底：纯拼音关键词且无书名命中时
        if not book_res and keyword.isascii() and keyword.isalpha():
            candidates = await self._pinyin_candidates()
            suggestions.extend(
                SearchSuggestion(type="book", text=n.title, book_id=str(n.id))
                for n in _pinyin_match(candidates, keyword)[:3]
            )

        suggestions.extend(author_res)
        suggestions.extend(tag_res)

        result = suggestions[:_MAX_SUGGESTIONS]
        await cache_set(self.redis, key, result, _TTL_SUGGESTION)
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

        # 从 ZSet 取 Top N，过滤过短的无意义词
        try:
            hot = await self.redis.zrevrange(CacheKeys.SEARCH_HOT_ZSET, 0, limit - 1)
            result = [h for h in hot if h and len(h.strip()) >= 2]
        except Exception:
            logger.warning("Redis ZRevRange failed", exc_info=True)
            result = []
        await cache_set(self.redis, CacheKeys.HOT_SEARCHES, result, _TTL_HOT_SEARCH)
        return result

    # ── 内部工具 ─────────────────────────────────────────
    async def _pinyin_candidates(self) -> list[Novel]:
        """取拼音兜底候选集（已发布作品，按点击量降序取 Top N），缓存 10 分钟。

        使用 orjson 替代 json 序列化，减少序列化耗时。
        """
        cached = await self.redis.get(CacheKeys.PINYIN_CANDIDATES)
        if cached:
            return [Novel(**d) for d in json.loads(cached)]

        stmt = (
            select(Novel)
            .where(Novel.deleted == 0, Novel.status == "published")
            .order_by(Novel.click_count.desc())
            .limit(_PINYIN_CANDIDATES)
        )
        novels = list((await self.session.execute(stmt)).scalars().all())
        # 提取关键字段预构建 dicts，避免在 JSON 序列化时重复访问 ORM 属性
        rows = [
            {k: getattr(n, k) for k in ("id", "title", "author_name", "cover", "category",
                                         "tags_str", "word_count", "is_completed", "rating",
                                         "rating_count", "follow_count", "click_count",
                                         "intro", "flags", "updated_at")}
            for n in novels
        ]
        with contextlib.suppress(Exception):
            import orjson
            await self.redis.set(
                CacheKeys.PINYIN_CANDIDATES,
                orjson.dumps(rows).decode("utf-8"),
                ex=self._TTL_PINYIN_CANDIDATES,
            )
        return novels

    async def _search_novels(
        self, keyword: str, page: int, page_size: int
    ) -> tuple[list[Novel], int]:
        if not keyword or not keyword.strip():
            return [], 0
        keyword = keyword.strip()
        # 单次查询同时匹配书名和作者名，减少往返次数
        stmt = (
            select(Novel)
            .where(
                Novel.deleted == 0,
                Novel.status == "published",
                (
                    Novel.title.contains(keyword)
                    | Novel.author_name.contains(keyword)
                ),
            )
            .order_by(Novel.click_count.desc())
        )
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()
        if total == 0 and keyword.isascii() and keyword.isalpha():
            matched = _pinyin_match(await self._pinyin_candidates(), keyword)
            total = len(matched)
            items = matched[(page - 1) * page_size : page * page_size]
            return list(items), total
        result = await self.session.execute(stmt.offset((page - 1) * page_size).limit(page_size))
        return list(result.scalars().all()), total

    async def _record_search(self, keyword: str) -> None:
        try:
            await self.redis.zincrby(CacheKeys.SEARCH_HOT_ZSET, 1.0, keyword)
        except Exception:
            logger.debug("搜索词频记录失败 keyword=%s", keyword, exc_info=True)
