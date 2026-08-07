"""C 端书籍服务（§7.2）。

提供书籍详情、章节列表、章节正文、相关推荐、评论列表、评分分布。
点击数异步累加至 Redis，详情走 Cache-Aside。
"""

import json

import redis.asyncio as redis
import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BizError, ErrorCode, NotFoundError
from app.core.redis import CacheKeys
from app.models.interaction import Comment as CommentModel
from app.models.interaction import Review as ReviewModel
from app.models.novel import Chapter, Novel
from app.repositories.chapter_repo import ChapterRepository
from app.repositories.novel_repo import NovelRepository
from app.schemas.c_end import (
    BookSummary,
    ChapterContent,
    ChapterListItem,
    Comment,
    CommentUser,
    RatingBucket,
    RatingDistribution,
)
from app.services._converters import novel_to_c_summary
from app.utils.cache import cache_set

logger = structlog.get_logger(__name__)

_TTL_BOOK = 3600  # 1 小时（热门书籍高频访问，减少回源）
_TTL_RATING = 600
_TTL_CHAPTER = 600  # 章节正文缓存（B 端更新依赖 TTL 自然过期）
_TTL_CHAPTERS = 600  # 章节列表缓存


class BookService:
    """C 端书籍聚合服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.novel_repo = NovelRepository(session)
        self.chapter_repo = ChapterRepository(session)

    # ── 书籍详情 ─────────────────────────────────────────
    async def get_book(self, book_id: int) -> BookSummary:
        """获取书籍详情，异步累加点击数。

        Args:
            book_id: 书籍 ID。

        Returns:
            书籍摘要。
        """
        novel = await self._get_published_novel(book_id)
        # 异步累加点击数（不阻塞响应）
        await self._incr_click(book_id)
        return novel_to_c_summary(novel)

    # ── 章节列表 ─────────────────────────────────────────
    async def get_chapters(self, book_id: int) -> list[ChapterListItem]:
        """获取已发布章节列表。

        Args:
            book_id: 书籍 ID。

        Returns:
            章节列表项。
        """
        novel = await self._get_published_novel(book_id)
        cache_key = CacheKeys.chapters(novel.id)
        cached = await self.redis.get(cache_key)
        if cached:
            try:
                return [ChapterListItem.model_validate(x) for x in json.loads(cached)]
            except Exception:
                logger.debug("章节列表缓存解析失败 book_id=%s", book_id, exc_info=True)
        chapters = await self.chapter_repo.list_by_novel(novel.id, status="published")
        items = [_chapter_to_list_item(c, novel.id) for c in chapters]
        await cache_set(
            self.redis, cache_key, [x.model_dump(mode="json") for x in items], _TTL_CHAPTERS
        )
        return items

    # ── 章节正文 ─────────────────────────────────────────
    async def get_chapter(
        self, book_id: int, chapter_id: int, *, reader_vip: bool = False
    ) -> ChapterContent:
        """获取章节正文（含前后章节导航），VIP 章节需会员权限。

        阅读热路径走 Cache-Aside：缓存命中直接返回，未命中回查库并回填。
        VIP 权限校验独立于缓存执行，避免绕过订阅。

        Args:
            book_id: 书籍 ID。
            chapter_id: 章节 ID。
            reader_vip: 读者是否为 VIP。

        Returns:
            章节正文内容。
        """
        novel = await self._get_published_novel(book_id)
        content = await self._get_cached_chapter(chapter_id, novel.id)
        if content is None:
            chapter = await self.chapter_repo.get_by_id(chapter_id)
            if not chapter or chapter.novel_id != novel.id or chapter.status != "published":
                raise NotFoundError("章节不存在或未发布")

            prev_ch, next_ch = await self.chapter_repo.get_neighbors(novel.id, chapter.index)
            content = _chapter_to_content(chapter, novel.id, prev_ch, next_ch)
            await self._cache_chapter(chapter_id, novel.id, content)
        return self._enforce_vip(content, reader_vip)

    async def _get_cached_chapter(self, chapter_id: int, novel_id: int) -> ChapterContent | None:
        """读取章节缓存，校验书籍归属，解析失败或归属不符时回源。"""
        try:
            cached = await self.redis.get(CacheKeys.chapter(chapter_id))
            if not cached:
                return None
            data = json.loads(cached)
            if data.get("novel_id") != novel_id:
                return None
            return ChapterContent.model_validate(data["content"])
        except Exception:
            logger.warning("章节缓存读取失败 chapter_id=%s", chapter_id, exc_info=True)
            return None

    async def _cache_chapter(self, chapter_id: int, novel_id: int, content: ChapterContent) -> None:
        try:
            await cache_set(
                self.redis,
                CacheKeys.chapter(chapter_id),
                {"novel_id": novel_id, "content": content.model_dump(mode="json")},
                _TTL_CHAPTER,
            )
        except Exception:
            logger.warning("章节缓存写入失败 chapter_id=%s", chapter_id, exc_info=True)

    @staticmethod
    def _enforce_vip(content: ChapterContent, reader_vip: bool) -> ChapterContent:
        if content.is_vip and not reader_vip:
            raise BizError(ErrorCode.VIP_CHAPTER_LOCKED, "VIP 章节需要开通会员")
        return content

    # ── 相关推荐 ─────────────────────────────────────────
    async def get_related_books(self, book_id: int, limit: int = 6) -> list[BookSummary]:
        """获取同分类相关推荐书籍。

        Args:
            book_id: 源书籍 ID。
            limit: 推荐数量。

        Returns:
            相关书籍列表。
        """
        novel = await self._get_published_novel(book_id)
        # 同分类高评分推荐
        stmt = (
            select(Novel)
            .where(
                Novel.id != novel.id,
                Novel.deleted == 0,
                Novel.status == "published",
                Novel.category == novel.category,
            )
            .order_by(Novel.rating.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return [novel_to_c_summary(n) for n in result.scalars().all()]

    # ── 评论列表 ─────────────────────────────────────────
    async def get_comments(self, book_id: int, limit: int = 20) -> list[Comment]:
        """获取书籍评论列表（按点赞数排序）。

        Args:
            book_id: 书籍 ID。
            limit: 数量限制。

        Returns:
            评论列表。
        """
        novel = await self._get_published_novel(book_id)
        comments = await self._list_comments_with_users(novel.id, limit)
        return comments

    # ── 评分分布 ─────────────────────────────────────────
    async def get_rating_distribution(self, book_id: int) -> RatingDistribution:
        """获取评分分布（1-5 星各档数量及占比，Cache-Aside）。

        Args:
            book_id: 书籍 ID。

        Returns:
            评分分布数据。
        """
        novel = await self._get_published_novel(book_id)
        cached = await self.redis.get(CacheKeys.book_rating(novel.id))
        if cached:
            return RatingDistribution.model_validate_json(cached)

        stmt = (
            select(ReviewModel.rating, func.count())
            .where(ReviewModel.novel_id == novel.id, ReviewModel.rating > 0)
            .group_by(ReviewModel.rating)
        )
        rows = (await self.session.execute(stmt)).all()
        total = sum(r[1] for r in rows)
        avg = float(novel.rating)

        buckets: list[RatingBucket] = []
        for star in range(5, 0, -1):
            count = next((r[1] for r in rows if r[0] == star), 0)
            percent = round(count / total * 100, 1) if total else 0.0
            buckets.append(RatingBucket(star=star, count=count, percent=percent))

        dist = RatingDistribution(total=total, average=avg, buckets=buckets)
        await cache_set(self.redis, CacheKeys.book_rating(novel.id), dist, _TTL_RATING)
        return dist

    # ── 内部工具 ─────────────────────────────────────────
    async def _get_published_novel(self, book_id: int) -> Novel:
        cached = await self.redis.get(CacheKeys.book(book_id))
        if cached:
            data = json.loads(cached)
            novel = Novel(**data)
            return novel

        novel = await self.novel_repo.get_by_id(book_id)
        if not novel or novel.deleted or novel.status != "published":
            raise NotFoundError("作品不存在或已下架")

        await cache_set(
            self.redis,
            CacheKeys.book(book_id),
            {
                "id": novel.id,
                "title": novel.title,
                "author_id": novel.author_id,
                "author_name": novel.author_name,
                "cover": novel.cover,
                "category": novel.category,
                "intro": novel.intro,
                "word_count": novel.word_count,
                "status": novel.status,
                "flags": novel.flags,
                "rating": float(novel.rating),
                "rating_count": novel.rating_count,
                "follow_count": novel.follow_count,
                "click_count": novel.click_count,
                "is_completed": novel.is_completed,
            },
            _TTL_BOOK,
        )
        return novel

    async def _incr_click(self, book_id: int) -> None:
        try:
            await self.redis.incr(CacheKeys.book_click(book_id))
        except Exception:
            logger.debug("点击计数失败 book_id=%s", book_id, exc_info=True)

    async def _list_comments_with_users(self, novel_id: int, limit: int) -> list[Comment]:
        stmt = (
            select(CommentModel)
            .where(CommentModel.novel_id == novel_id, CommentModel.status == 1)
            .order_by(CommentModel.likes.desc(), CommentModel.created_at.desc())
            .limit(limit)
        )
        comments = list((await self.session.execute(stmt)).scalars().all())
        return [
            Comment(
                id=str(c.id),
                book_id=str(c.novel_id),
                user=CommentUser(id=str(c.reader_id), nickname="", avatar=""),
                rating=c.rating,
                content=c.content,
                likes=c.likes,
                created_at=c.created_at,
            )
            for c in comments
        ]


def _chapter_to_list_item(ch: Chapter, novel_id: int) -> ChapterListItem:
    return ChapterListItem(
        id=str(ch.id),
        book_id=str(novel_id),
        index=ch.index,
        title=ch.title,
        word_count=ch.word_count,
        is_vip=bool(ch.is_vip),
        published_at=ch.published_at,
    )


def _chapter_to_content(
    ch: Chapter, novel_id: int, prev_ch: Chapter | None, next_ch: Chapter | None
) -> ChapterContent:
    paragraphs = [p for p in ch.content.split("\n\n") if p.strip()]
    return ChapterContent(
        id=str(ch.id),
        book_id=str(novel_id),
        index=ch.index,
        title=ch.title,
        word_count=ch.word_count,
        is_vip=bool(ch.is_vip),
        published_at=ch.published_at,
        paragraphs=paragraphs,
        prev_id=str(prev_ch.id) if prev_ch else None,
        next_id=str(next_ch.id) if next_ch else None,
    )
