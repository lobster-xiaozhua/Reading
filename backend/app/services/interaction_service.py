"""C 端互动服务（§7.6）。

处理写操作：加入/移出书架、上报阅读进度、提交评论、点赞、打赏、评分。
以及读操作：书评列表、话题、书单。
"""

import contextlib
import json
import logging
import time

import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ParamError
from app.core.redis import CacheKeys
from app.models.interaction import Comment as CommentModel
from app.models.interaction import Review as ReviewModel
from app.models.interaction import RewardRecord as RewardModel
from app.models.novel import Novel
from app.repositories.reader_repo import BookshelfRepository, ReadingHistoryRepository
from app.schemas.c_end import (
    BookList,
    CommentUser,
    Review,
    ReviewBookRef,
    Topic,
)

logger = logging.getLogger(__name__)

_TTL_PROGRESS = 90 * 24 * 3600  # 90 天


class InteractionService:
    """C 端互动服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.shelf_repo = BookshelfRepository(session)
        self.history_repo = ReadingHistoryRepository(session)

    # ── 书架操作 ─────────────────────────────────────────
    async def add_to_bookshelf(self, reader_id: int, novel_id: int) -> bool:
        """将作品加入读者书架（已存在则直接返回成功）。

        Args:
            reader_id: 读者 ID。
            novel_id: 作品 ID。

        Returns:
            操作是否成功。
        """
        novel = await self._get_novel(novel_id)
        if await self.shelf_repo.is_in_shelf(reader_id, novel.id):
            return True
        await self.shelf_repo.add(reader_id, novel.id)
        await self.session.commit()
        return True

    async def remove_from_bookshelf(self, reader_id: int, novel_id: int) -> bool:
        """将作品移出读者书架。

        Args:
            reader_id: 读者 ID。
            novel_id: 作品 ID。

        Returns:
            是否实际移除了记录。
        """
        removed = await self.shelf_repo.remove(reader_id, novel_id)
        if removed:
            await self.session.commit()
        return removed

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

        # 同步落库
        await self.history_repo.upsert(
            reader_id, novel_id, chapter_id, chapter_index, percent
        )
        await self.session.commit()
        return True

    # ── 评论 ──────────────────────────────────────────
    async def create_comment(
        self,
        reader_id: int,
        novel_id: int,
        content: str,
        rating: int = 0,
    ) -> str:
        """创建评论。

        Args:
            reader_id: 读者 ID。
            novel_id: 作品 ID。
            content: 评论内容。
            rating: 评分（0-5）。

        Returns:
            创建的评论 ID。
        """
        if not content or not content.strip():
            raise ParamError("评论内容不能为空")
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

    async def like_comment(self, comment_id: int, reader_id: int) -> bool:
        """点赞评论（作者自己点赞不增加计数）。

        Args:
            comment_id: 评论 ID。
            reader_id: 读者 ID。

        Returns:
            操作是否成功。
        """
        comment = await self.session.get(CommentModel, comment_id)
        if not comment:
            raise NotFoundError("评论不存在")
        if comment.reader_id == reader_id:
            return True
        comment.likes += 1
        await self.session.commit()
        return True

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
    async def submit_rating(
        self, reader_id: int, novel_id: int, rating: int
    ) -> bool:
        """提交评分（1-5），并失效评分分布缓存。

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
        review = ReviewModel(
            reader_id=reader_id,
            novel_id=novel.id,
            rating=rating,
            content="",
            created_at=int(time.time() * 1000),
        )
        self.session.add(review)
        await self.session.commit()
        # 失效评分分布缓存
        with contextlib.suppress(Exception):
            await self.redis.delete(CacheKeys.book_rating(novel.id))
        return True

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
                book=ReviewBookRef(
                    id=str(n.id), title=n.title, cover=n.cover
                ),
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
        """基于标签热度生成话题列表。"""
        from app.models.novel import Tag
        stmt = select(Tag).order_by(Tag.ref_count.desc()).limit(limit)
        tags = list((await self.session.execute(stmt)).scalars().all())
        return [
            Topic(id=str(t.id), name=t.name, count=t.ref_count) for t in tags
        ]

    # ── 书单 ──────────────────────────────────────────
    async def get_book_lists(self, limit: int = 10) -> list[BookList]:
        """获取推荐书单（基于高评分作品按分类聚合）。

        Args:
            limit: 书单数量限制。

        Returns:
            书单列表。
        """
        """返回推荐书单（基于高评分作品聚合）。"""
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
