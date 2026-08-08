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
from app.models.interaction import NovelRating
from app.models.novel import Chapter, Novel
from app.models.user import Reader
from app.repositories.chapter_repo import ChapterRepository
from app.repositories.novel_repo import NovelRepository
from app.schemas.c_end import (
    BookDetailResponse,
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
        """读取章节缓存，键含 novel_id 从根上避免跨书误命中。"""
        try:
            cached = await self.redis.get(CacheKeys.chapter(novel_id, chapter_id))
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
                CacheKeys.chapter(novel_id, chapter_id),
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
            select(NovelRating.rating, func.count())
            .where(NovelRating.novel_id == novel.id, NovelRating.rating > 0)
            .group_by(NovelRating.rating)
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

    # ── 详情页聚合 ───────────────────────────────────────
    async def get_book_detail(self, book_id: int) -> BookDetailResponse:
        """一次性返回书籍详情 + 章节列表 + 评分分布，减少网络往返。

        子模块失败时降级为空数组/None，不阻塞整页渲染。
        """
        book = await self.get_book(book_id)
        chapters: list[ChapterListItem] = []
        rating: RatingDistribution | None = None
        try:
            chapters = await self.get_chapters(book_id)
        except Exception:
            logger.warning("章节列表加载失败 book_id=%s", book_id, exc_info=True)
        try:
            rating = await self.get_rating_distribution(book_id)
        except Exception:
            logger.warning("评分分布加载失败 book_id=%s", book_id, exc_info=True)
        return BookDetailResponse(book=book, chapters=chapters, rating=rating)

    # ── 内部工具 ─────────────────────────────────────────
    async def _get_published_novel(self, book_id: int) -> Novel:
        cached = await self.redis.get(CacheKeys.book(book_id))
        if cached:
            try:
                data = json.loads(cached)
                # 缓存可能由旧版本写入而缺字段，缺失必要字段时回源数据库
                required = {
                    "id",
                    "title",
                    "author_name",
                    "category",
                    "status",
                    "word_count",
                    "flags",
                    "tags_str",
                    "updated_at",
                }
                if required.issubset(data):
                    return Novel(**data)
            except (ValueError, TypeError):
                logger.debug("书籍缓存解析失败 book_id=%s，回源", book_id, exc_info=True)

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
                "tags_str": novel.tags_str,
                "updated_at": novel.updated_at,
            },
            _TTL_BOOK,
        )
        return novel

    async def _incr_click(self, book_id: int) -> None:
        try:
            # 使用 Pipeline 批量提交，减少 RTT
            pipe = self.redis.pipeline()
            pipe.incr(CacheKeys.book_click(book_id))
            await pipe.execute()
        except Exception:
            logger.debug("点击计数失败 book_id=%s", book_id, exc_info=True)

    async def _list_comments_with_users(self, novel_id: int, limit: int) -> list[Comment]:
        # 联查读者：填充昵称/头像，已注销（deleted）用户昵称显示「已注销」
        stmt = (
            select(CommentModel, Reader)
            .join(Reader, Reader.id == CommentModel.reader_id, isouter=True)
            .where(
                CommentModel.novel_id == novel_id,
                CommentModel.status == 1,
                CommentModel.deleted == 0,
            )
            .order_by(CommentModel.likes.desc(), CommentModel.created_at.desc())
            .limit(limit)
        )
        rows = list((await self.session.execute(stmt)).all())
        return [
            Comment(
                id=str(c.id),
                book_id=str(c.novel_id),
                user=CommentUser(
                    id=str(c.reader_id),
                    nickname=_reader_nickname(reader),
                    avatar=reader.avatar if reader else "",
                ),
                rating=c.rating,
                content=c.content,
                likes=c.likes,
                created_at=c.created_at,
            )
            for c, reader in rows
        ]


def _reader_nickname(reader: Reader | None) -> str:
    """读者展示昵称：已注销用户显示「已注销」，无记录显示「读者」。"""
    if reader is None:
        return "读者"
    if reader.deleted:
        return "已注销"
    return reader.nickname or reader.username


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
