"""互动仓储：评论 / 书评 / 打赏（§4.2.4）。"""

import time

from sqlalchemy import select

from app.models.interaction import Comment, Review, RewardRecord
from app.repositories.base import BaseRepository


class CommentRepository(BaseRepository[Comment]):
    model = Comment

    async def list_by_novel(self, novel_id: int, limit: int = 20) -> list[Comment]:
        """获取指定作品的评论列表，按点赞数和时间降序排列。"""
        stmt = (
            select(Comment)
            .where(Comment.novel_id == novel_id, Comment.status == 1)
            .order_by(Comment.likes.desc(), Comment.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_chapter(self, chapter_id: int) -> list[Comment]:
        """获取指定章节的评论列表，按时间降序排列。"""
        stmt = (
            select(Comment)
            .where(Comment.chapter_id == chapter_id, Comment.status == 1)
            .order_by(Comment.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class ReviewRepository(BaseRepository[Review]):
    model = Review

    async def list_by_novel(self, novel_id: int, limit: int = 20) -> list[Review]:
        """获取指定作品的书评列表，按点赞数和时间降序排列。"""
        stmt = (
            select(Review)
            .where(Review.novel_id == novel_id)
            .order_by(Review.likes.desc(), Review.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_recent(self, limit: int = 20) -> list[Review]:
        """获取最近的书评列表，按时间降序排列。"""
        stmt = select(Review).order_by(Review.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class RewardRepository(BaseRepository[RewardRecord]):
    model = RewardRecord

    async def list_by_reader(self, reader_id: int, limit: int = 20) -> list[RewardRecord]:
        """获取读者的打赏记录列表，按时间降序排列。"""
        stmt = (
            select(RewardRecord)
            .where(RewardRecord.reader_id == reader_id)
            .order_by(RewardRecord.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, reader_id: int, novel_id: int, type_: str, amount: int) -> RewardRecord:
        """创建一条打赏记录。"""
        record = RewardRecord(
            reader_id=reader_id,
            novel_id=novel_id,
            type=type_,
            amount=amount,
            created_at=int(time.time() * 1000),
        )
        self.session.add(record)
        await self.session.flush()
        return record
