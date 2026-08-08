"""C 端互动服务（§7.6）。

处理写操作：加入/移出书架、上报阅读进度、提交评论、点赞、打赏、评分。
以及读操作：书评列表、话题、书单。
"""

import contextlib
import json
import time
from datetime import date

import redis.asyncio as redis
import structlog
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ParamError
from app.core.redis import CacheKeys
from app.models.interaction import Comment as CommentModel
from app.models.interaction import CommentLike, NovelRating
from app.models.interaction import Review as ReviewModel
from app.models.interaction import RewardRecord as RewardModel
from app.models.novel import Chapter, Novel
from app.repositories.reader_repo import (
    BookshelfRepository,
    ReadingHistoryRepository,
    ReadingStatsRepository,
)
from app.schemas.c_end import (
    BookList,
    CommentUser,
    Review,
    ReviewBookRef,
    Topic,
)

logger = structlog.get_logger(__name__)

_TTL_PROGRESS = 90 * 24 * 3600  # 90 天
_PROGRESS_FLUSH_INTERVAL = 5  # 阅读进度落库最小间隔（秒），避免高频写 DB
_PROGRESS_FLUSH_KEY = "progress:flush"


class InteractionService:
    """C 端互动服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.shelf_repo = BookshelfRepository(session)
        self.history_repo = ReadingHistoryRepository(session)
        self.stats_repo = ReadingStatsRepository(session)

# ── 书架操作 ─────────────────────────────────────────
    async def add_to_bookshelf(self, reader_id: int, novel_id: int) -> bool:
        """将作品加入读者书架（已存在则直接返回成功）。"""
        novel = await self._get_novel(novel_id)
        if await self.shelf_repo.is_in_shelf(reader_id, novel.id):
            return True
        try:
            await self.shelf_repo.add(reader_id, novel.id)
            await self.session.commit()
        except IntegrityError:
            # 并发下唯一约束冲突：已存在则视为成功
            await self.session.rollback()
        await self._evict_user_caches(reader_id)
        return True

    async def remove_from_bookshelf(self, reader_id: int, novel_id: int) -> bool:
        """将作品移出读者书架。"""
        removed = await self.shelf_repo.remove(reader_id, novel_id)
        if removed:
            await self.session.commit()
            await self._evict_user_caches(reader_id)
        return removed

    async def batch_remove_bookshelf(self, reader_id: int, novel_ids: list[int]) -> int:
        """批量移出书架，返回实际移除数量。"""
        count = 0
        for nid in novel_ids:
            if await self.shelf_repo.remove(reader_id, nid):
                count += 1
        await self.session.commit()
        if count:
            await self._evict_user_caches(reader_id)
        return count

    async def _evict_user_caches(self, reader_id: int) -> None:
        """书架/追更变更后失效用户相关缓存。"""
        with contextlib.suppress(Exception):
            await self.redis.delete(
                CacheKeys.bookshelf(reader_id), CacheKeys.follows(reader_id)
            )

    # ── 阅读进度 ─────────────────────────────────────────
    async def report_reading_progress(
        self,
        reader_id: int,
        novel_id: int,
        chapter_id: int | None = None,
        chapter_index: int | None = None,
        percent: float = 0.0,
    ) -> bool:
        """上报阅读进度（写入 Redis 实时进度 + 同步落库）。

        Args:
            reader_id: 读者 ID。
            novel_id: 作品 ID。
            chapter_id: 章节 ID。
            chapter_index: 章节索引。
            percent: 阅读百分比。

        Returns:
            操作是否成功。
        """
        # 写入 Redis 实时进度
        progress_key = CacheKeys.progress(reader_id)
        try:
            await self.redis.hset(
                progress_key,
                str(novel_id),
                json.dumps(
                    {
                        "chapterId": chapter_id,
                        "chapterIndex": chapter_index,
                        "percent": percent,
                        "ts": int(time.time() * 1000),
                    }
                ),
            )
            await self.redis.expire(progress_key, _TTL_PROGRESS)
        except Exception:
            logger.debug("阅读进度写入 Redis 失败 reader=%s", reader_id, exc_info=True)

        # 同步落库（Redis SETNX 分布式节流：5 秒内同一读者只落库一次）
        flush_key = f"{_PROGRESS_FLUSH_KEY}:{reader_id}"
        acquired = False
        try:
            acquired = bool(
                await self.redis.set(
                    flush_key, "1", nx=True, ex=_PROGRESS_FLUSH_INTERVAL
                )
            )
        except Exception:
            logger.debug("进度节流标记写入失败 reader=%s", reader_id, exc_info=True)
        if acquired:
            await self.history_repo.upsert(reader_id, novel_id, chapter_id, chapter_index, percent)
            await self._upsert_daily_stat(reader_id, chapter_id)
            await self.session.commit()
        return True

    async def _upsert_daily_stat(self, reader_id: int, chapter_id: int | None) -> None:
        """更新每日阅读统计：时长按会话步进，字数取当前章最大值。

        Args:
            reader_id: 读者 ID。
            chapter_id: 当前章节 ID。
        """
        words = 0
        if chapter_id:
            chapter = await self.session.get(Chapter, chapter_id)
            if chapter:
                words = chapter.word_count or 0
        await self.stats_repo.upsert_daily(reader_id, date.today(), duration_delta=1, words=words)

    # ── 评论 ──────────────────────────────────────────
    async def create_comment(
        self,
        reader_id: int,
        novel_id: int,
        content: str,
        rating: int = 0,
    ) -> str:
        """创建评论（含敏感词拦截）。"""
        if not content or not content.strip():
            raise ParamError("评论内容不能为空")
        await self._check_sensitive(content)
        novel = await self._get_novel(novel_id)
        comment = CommentModel(
            novel_id=novel.id,
            reader_id=reader_id,
            rating=rating,
            content=content.strip(),
            likes=0,
            status=1,
            created_at=int(time.time() * 1000),
        )
        self.session.add(comment)
        await self.session.flush()
        await self.session.commit()
        return str(comment.id)

    async def _check_sensitive(self, text: str) -> None:
        """敏感词拦截：命中高危/警告级直接拒绝。"""
        try:
            from app.services.sensitive_service import SensitiveService

            svc = SensitiveService(self.session, self.redis)
            hits = await svc.scan(text)
        except Exception:
            logger.debug("敏感词扫描失败（放行）", exc_info=True)
            return
        if any(h.level <= 2 for h in hits):
            raise ParamError("评论包含敏感内容")

    async def like_comment(self, comment_id: int, reader_id: int) -> bool:
        """点赞评论（幂等：同一读者对同一评论仅计一次；作者自赞不计数）。"""
        comment = await self.session.get(CommentModel, comment_id)
        if not comment:
            raise NotFoundError("评论不存在")
        if comment.reader_id == reader_id:
            return True
        # 已赞则直接返回，避免重复计数
        existing = await self.session.execute(
            select(CommentLike).where(
                CommentLike.comment_id == comment_id,
                CommentLike.reader_id == reader_id,
            )
        )
        if existing.scalars().first():
            return True
        self.session.add(
            CommentLike(
                comment_id=comment_id,
                reader_id=reader_id,
                created_at=int(time.time() * 1000),
            )
        )
        try:
            await self.session.flush()
        except IntegrityError:
            # 并发重复点赞：唯一约束冲突，视为已点赞（幂等）
            await self.session.rollback()
            return True
        # 原子自增，避免并发下 `likes += 1` 读改写丢失计数
        await self.session.execute(
            update(CommentModel)
            .where(CommentModel.id == comment_id)
            .values(likes=CommentModel.likes + 1)
        )
        await self.session.commit()
        return True

    # ── 评论回复 ──────────────────────────────────────
    async def reply_comment(self, reader_id: int, comment_id: int, content: str) -> str:
        """回复评论（含敏感词拦截）。"""
        if not content or not content.strip():
            raise ParamError("回复内容不能为空")
        await self._check_sensitive(content)
        parent = await self.session.get(CommentModel, comment_id)
        if not parent:
            raise NotFoundError("评论不存在")
        reply = CommentModel(
            novel_id=parent.novel_id,
            reader_id=reader_id,
            parent_id=comment_id,
            content=content.strip(),
            likes=0,
            status=1,
            created_at=int(time.time() * 1000),
        )
        self.session.add(reply)
        await self.session.flush()
        await self.session.commit()
        return str(reply.id)

    # ── 打赏 ──────────────────────────────────────────
    async def create_reward(
        self,
        reader_id: int,
        novel_id: int,
        type_: str,
        amount: int,
    ) -> str:
        """创建打赏记录。

        Args:
            reader_id: 读者 ID。
            novel_id: 作品 ID。
            type_: 打赏类型。
            amount: 打赏金额。

        Returns:
            打赏记录 ID。
        """
        if amount <= 0:
            raise ParamError("打赏金额必须大于 0")
        novel = await self._get_novel(novel_id)
        record = RewardModel(
            reader_id=reader_id,
            novel_id=novel.id,
            type=type_,
            amount=amount,
            created_at=int(time.time() * 1000),
        )
        self.session.add(record)
        await self.session.flush()
        await self.session.commit()
        return str(record.id)

    # ── 评分 ──────────────────────────────────────────
    async def submit_rating(self, reader_id: int, novel_id: int, rating: int) -> bool:
        """提交评分（1-5，幂等 upsert），并重算作品均分、失效评分分布缓存。

        Args:
            reader_id: 读者 ID。
            novel_id: 作品 ID。
            rating: 评分值。

        Returns:
            操作是否成功。
        """
        if not 1 <= rating <= 5:
            raise ParamError("评分范围 1-5")
        novel = await self._get_novel(novel_id)
        now = int(time.time() * 1000)
        existing = await self.session.execute(
            select(NovelRating).where(
                NovelRating.novel_id == novel.id,
                NovelRating.reader_id == reader_id,
            )
        )
        prev = existing.scalars().first()
        if prev:
            prev.rating = rating
            prev.created_at = now
        else:
            self.session.add(
                NovelRating(
                    novel_id=novel.id,
                    reader_id=reader_id,
                    rating=rating,
                    created_at=now,
                )
            )
        try:
            await self.session.flush()
        except IntegrityError:
            # 并发重复提交评分：唯一约束冲突，按幂等处理
            await self.session.rollback()
            return True
        await self.session.commit()
        await self._recalc_rating(novel.id)
        # 失效评分分布缓存
        with contextlib.suppress(Exception):
            await self.redis.delete(CacheKeys.book_rating(novel.id))
        return True

    async def _recalc_rating(self, novel_id: int) -> None:
        """按 novel_ratings 表重算作品均分与评分人数。"""
        from sqlalchemy import func

        stmt = select(
            func.count(NovelRating.id),
            func.coalesce(func.avg(NovelRating.rating), 0.0),
        ).where(NovelRating.novel_id == novel_id)
        count, avg = (await self.session.execute(stmt)).one()
        novel = await self.session.get(Novel, novel_id)
        if novel:
            novel.rating = float(avg)
            novel.rating_count = int(count or 0)
            await self.session.commit()

    # ── 书评列表（全局） ───────────────────────────────────
    async def get_reviews(self, limit: int = 20) -> list[Review]:
        """获取全局书评列表（按点赞数排序）。

        Args:
            limit: 数量限制。

        Returns:
            书评列表。
        """
        stmt = (
            select(ReviewModel, Novel)
            .join(Novel, ReviewModel.novel_id == Novel.id)
            .order_by(ReviewModel.likes.desc(), ReviewModel.created_at.desc())
            .limit(limit)
        )
        rows = (await self.session.execute(stmt)).all()
        return [
            Review(
                id=str(r.id),
                user=CommentUser(id=str(r.reader_id), nickname="", avatar=""),
                book=ReviewBookRef(id=str(n.id), title=n.title, cover=n.cover),
                rating=r.rating,
                content=r.content,
                likes=r.likes,
                replies=r.replies,
                created_at=r.created_at,
            )
            for r, n in rows
        ]

    # ── 话题 ──────────────────────────────────────────
    async def get_topics(self, limit: int = 20) -> list[Topic]:
        """获取话题列表（基于标签热度）。

        Args:
            limit: 数量限制。

        Returns:
            话题列表。
        """
        from app.models.novel import Tag

        stmt = select(Tag).order_by(Tag.ref_count.desc()).limit(limit)
        tags = list((await self.session.execute(stmt)).scalars().all())
        return [Topic(id=str(t.id), name=t.name, count=t.ref_count) for t in tags]

    # ── 书单 ──────────────────────────────────────────
    async def get_book_lists(self, limit: int = 10) -> list[BookList]:
        """获取推荐书单（基于高评分作品按分类聚合）。

        Args:
            limit: 书单数量限制。

        Returns:
            书单列表。
        """
        stmt = (
            select(Novel)
            .where(Novel.deleted == 0, Novel.status == "published")
            .order_by(Novel.rating.desc())
            .limit(limit * 3)
        )
        novels = list((await self.session.execute(stmt)).scalars().all())
        if not novels:
            return []
        # 简单按分类分组成书单
        by_category: dict[str, list[Novel]] = {}
        for n in novels:
            by_category.setdefault(n.category, []).append(n)

        result: list[BookList] = []
        from app.schemas.enums import BOOK_CATEGORY_LABELS

        for cat, books in list(by_category.items())[:limit]:
            name = BOOK_CATEGORY_LABELS.get(cat, "精选")
            result.append(
                BookList(
                    id=f"bl-{cat}",
                    title=f"{name}精选书单",
                    desc=f"精选 {len(books)} 本优质{name}作品",
                    cover=books[0].cover if books else "",
                    book_count=len(books),
                    follow_count=sum(b.follow_count for b in books),
                    created_at=books[0].created_at if books else 0,
                )
            )
        return result

    # ── 内部工具 ─────────────────────────────────────────
    async def _get_novel(self, novel_id: int) -> Novel:
        novel = await self.session.get(Novel, novel_id)
        if not novel or novel.deleted or novel.status != "published":
            raise NotFoundError("作品不存在或已下架")
        return novel
