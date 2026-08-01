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
        stmt = (
            select(Bookshelf)
            .where(Bookshelf.reader_id == reader_id)
            .order_by(Bookshelf.added_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def is_in_shelf(self, reader_id: int, novel_id: int) -> bool:
        stmt = select(Bookshelf).where(
            Bookshelf.reader_id == reader_id, Bookshelf.novel_id == novel_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().first() is not None

    async def add(self, reader_id: int, novel_id: int) -> Bookshelf:
        shelf = Bookshelf(
            reader_id=reader_id, novel_id=novel_id, added_at=int(time.time() * 1000)
        )
        self.session.add(shelf)
        await self.session.flush()
        return shelf

    async def remove(self, reader_id: int, novel_id: int) -> bool:
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

    async def get_by_reader_novel(
        self, reader_id: int, novel_id: int
    ) -> ReadingHistory | None:
        stmt = select(ReadingHistory).where(
            ReadingHistory.reader_id == reader_id, ReadingHistory.novel_id == novel_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_by_reader(self, reader_id: int, limit: int = 20) -> list[ReadingHistory]:
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
        stmt = (
            select(
                func.sum(ReadingStatsDaily.duration_minutes),
                func.sum(ReadingStatsDaily.words),
                func.count(),
            )
            .where(ReadingStatsDaily.reader_id == reader_id)
        )
        result = await self.session.execute(stmt)
        row = result.one()
        return {
            "total_reading_minutes": row[0] or 0,
            "total_read_words": row[1] or 0,
            "reading_days": row[2] or 0,
        }

    async def get_current_streak(self, reader_id: int) -> int:
        stmt = select(ReadingStatsDaily.stat_date).where(
            ReadingStatsDaily.reader_id == reader_id
        )
        result = await self.session.execute(stmt)
        dates = set(result.scalars().all())
        today = date.today()
        # 今天没读则从昨天起算
        start = today if today in dates else today - timedelta(days=1)
        streak = 0
        d = start
        while d in dates:
            streak += 1
            d -= timedelta(days=1)
        return streak

    async def get_heatmap(self, reader_id: int, days: int = 365) -> list[ReadingStatsDaily]:
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
