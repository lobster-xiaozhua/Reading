"""阅读仓储：读者 / 书架 / 阅读历史 / 每日统计（§4.2.1/§4.2.3）。"""

import time
from datetime import date, timedelta

from sqlalchemy import func, select

from app.models.reading import Bookshelf, ReadingHistory, ReadingStatsDaily
from app.models.user import Reader
from app.repositories.base import BaseRepository


class ReaderRepository(BaseRepository[Reader]):
    model = Reader


class BookshelfRepository(BaseRepository[Bookshelf]):
    model = Bookshelf

    async def list_by_reader(self, reader_id: int, limit: int = 100) -> list[Bookshelf]:
        """获取读者书架列表，按添加时间降序排列。"""
        stmt = (
            select(Bookshelf)
            .where(Bookshelf.reader_id == reader_id)
            .order_by(Bookshelf.added_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def is_in_shelf(self, reader_id: int, novel_id: int) -> bool:
        """检查作品是否已在读者书架中。"""
        stmt = select(Bookshelf).where(
            Bookshelf.reader_id == reader_id, Bookshelf.novel_id == novel_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().first() is not None

    async def add(self, reader_id: int, novel_id: int) -> Bookshelf:
        """将作品加入读者书架。"""
        shelf = Bookshelf(reader_id=reader_id, novel_id=novel_id, added_at=int(time.time() * 1000))
        self.session.add(shelf)
        await self.session.flush()
        return shelf

    async def remove(self, reader_id: int, novel_id: int) -> bool:
        """将作品移出读者书架，返回是否成功移除。"""
        stmt = select(Bookshelf).where(
            Bookshelf.reader_id == reader_id, Bookshelf.novel_id == novel_id
        )
        result = await self.session.execute(stmt)
        shelf = result.scalars().first()
        if shelf:
            await self.session.delete(shelf)
            await self.session.flush()
            return True
        return False


class ReadingHistoryRepository(BaseRepository[ReadingHistory]):
    model = ReadingHistory

    async def upsert(
        self,
        reader_id: int,
        novel_id: int,
        chapter_id: int | None,
        chapter_index: int | None,
        percent: float,
    ) -> ReadingHistory:
        """创建或更新阅读历史记录（同一读者+作品）。"""
        stmt = select(ReadingHistory).where(
            ReadingHistory.reader_id == reader_id, ReadingHistory.novel_id == novel_id
        )
        result = await self.session.execute(stmt)
        h = result.scalars().first()
        now = int(time.time() * 1000)
        if h:
            h.chapter_id = chapter_id or h.chapter_id
            h.chapter_index = chapter_index if chapter_index is not None else h.chapter_index
            h.percent = percent
            h.read_at = now
        else:
            h = ReadingHistory(
                reader_id=reader_id,
                novel_id=novel_id,
                chapter_id=chapter_id or 0,
                chapter_index=chapter_index or 0,
                percent=percent,
                read_at=now,
            )
            self.session.add(h)
        await self.session.flush()
        return h

    async def get_by_reader_novel(self, reader_id: int, novel_id: int) -> ReadingHistory | None:
        """根据读者 ID 和作品 ID 获取单条阅读历史。"""
        stmt = select(ReadingHistory).where(
            ReadingHistory.reader_id == reader_id, ReadingHistory.novel_id == novel_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_reader_novels(
        self, reader_id: int, novel_ids: list[int]
    ) -> dict[int, ReadingHistory]:
        """批量获取阅读历史，返回 {novel_id: history} 映射。"""
        if not novel_ids:
            return {}
        stmt = select(ReadingHistory).where(
            ReadingHistory.reader_id == reader_id,
            ReadingHistory.novel_id.in_(novel_ids),
        )
        result = await self.session.execute(stmt)
        return {h.novel_id: h for h in result.scalars().all()}

    async def list_by_reader(self, reader_id: int, limit: int = 20) -> list[ReadingHistory]:
        """获取读者的阅读历史列表，按阅读时间降序排列。"""
        stmt = (
            select(ReadingHistory)
            .where(ReadingHistory.reader_id == reader_id)
            .order_by(ReadingHistory.read_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class ReadingStatsRepository(BaseRepository[ReadingStatsDaily]):
    model = ReadingStatsDaily

    async def get_overview(self, reader_id: int) -> dict:
        """获取读者阅读概览：总时长/总字数/阅读天数。"""
        stmt = select(
            func.sum(ReadingStatsDaily.duration_minutes),
            func.sum(ReadingStatsDaily.words),
            func.count(),
        ).where(ReadingStatsDaily.reader_id == reader_id)
        result = await self.session.execute(stmt)
        row = result.one()
        return {
            "total_reading_minutes": row[0] or 0,
            "total_read_words": row[1] or 0,
            "reading_days": row[2] or 0,
        }

    async def get_current_streak(self, reader_id: int) -> int:
        """计算读者当前连续阅读天数（单条 SQL，避免全量加载日期）。"""
        from sqlalchemy import desc

        # 取最近一天（今天或昨天，取决于今天是否读过）
        stmt = (
            select(ReadingStatsDaily.stat_date)
            .where(ReadingStatsDaily.reader_id == reader_id)
            .order_by(desc(ReadingStatsDaily.stat_date))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        last = result.scalars().first()
        if not last:
            return 0

        today = date.today()
        # 若今天未读，从昨天起算
        start = last if last == today else today - timedelta(days=1)
        if start != last:
            return 0

        # 用窗口函数/set 计算连续频率：加载最近 N 天（上限 365）判断连续性
        # 避免全表扫描：仅取最近 400 天
        cutoff = start - timedelta(days=400)
        stmt_dates = (
            select(ReadingStatsDaily.stat_date)
            .where(
                ReadingStatsDaily.reader_id == reader_id,
                ReadingStatsDaily.stat_date >= cutoff,
            )
            .order_by(desc(ReadingStatsDaily.stat_date))
        )
        dates = set((await self.session.execute(stmt_dates)).scalars().all())
        streak = 0
        d = start
        while d in dates:
            streak += 1
            d -= timedelta(days=1)
        return streak

    async def get_heatmap(self, reader_id: int, days: int = 365) -> list[ReadingStatsDaily]:
        """获取读者指定天数的阅读热力图数据。"""
        start = date.today() - timedelta(days=days)
        stmt = (
            select(ReadingStatsDaily)
            .where(
                ReadingStatsDaily.reader_id == reader_id,
                ReadingStatsDaily.stat_date >= start,
            )
            .order_by(ReadingStatsDaily.stat_date)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
