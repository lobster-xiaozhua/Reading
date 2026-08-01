"""阅读域 ORM：书架 / 阅读历史 / 每日统计（§4.2.3）。"""

from datetime import date

from sqlalchemy import BigInteger, Date, Index, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin


class Bookshelf(Base, IdMixin):
    """书架。"""

    __tablename__ = "bookshelves"
    __table_args__ = (
        UniqueConstraint("reader_id", "novel_id", name="uq_bookshelf_reader_novel"),
    )

    reader_id: Mapped[int] = mapped_column(BigInteger)
    novel_id: Mapped[int] = mapped_column(BigInteger)
    added_at: Mapped[int] = mapped_column(BigInteger, default=0)


class ReadingHistory(Base, IdMixin):
    """阅读历史（一本书一条）。"""

    __tablename__ = "reading_histories"
    __table_args__ = (
        UniqueConstraint("reader_id", "novel_id", name="uq_history_reader_novel"),
        Index("idx_history_reader_readat", "reader_id", "read_at"),
    )

    reader_id: Mapped[int] = mapped_column(BigInteger)
    novel_id: Mapped[int] = mapped_column(BigInteger)
    chapter_id: Mapped[int] = mapped_column(BigInteger, default=0)
    chapter_index: Mapped[int] = mapped_column(Integer, default=0)
    percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    read_at: Mapped[int] = mapped_column(BigInteger, default=0)


class ReadingStatsDaily(Base, IdMixin):
    """每日阅读统计（热力图 / 偏好 / 徽章）。"""

    __tablename__ = "reading_stats_daily"
    __table_args__ = (
        UniqueConstraint("reader_id", "stat_date", name="uq_stats_reader_date"),
    )

    reader_id: Mapped[int] = mapped_column(BigInteger)
    stat_date: Mapped[date] = mapped_column(Date)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    words: Mapped[int] = mapped_column(Integer, default=0)
