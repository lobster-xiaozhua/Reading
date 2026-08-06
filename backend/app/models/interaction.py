"""互动域 ORM：评论 / 书评 / 打赏（§4.2.4）。"""

from sqlalchemy import BigInteger, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin


class Comment(Base, IdMixin):
    """评论 / 段评。"""

    __tablename__ = "comments"
    __table_args__ = (
        Index("idx_comments_novel_id", "novel_id"),
        Index("idx_comments_reader_id", "reader_id"),
    )

    novel_id: Mapped[int] = mapped_column(BigInteger)
    chapter_id: Mapped[int] = mapped_column(BigInteger, default=0)
    paragraph_index: Mapped[int] = mapped_column(Integer, default=0)
    reader_id: Mapped[int] = mapped_column(BigInteger)
    parent_id: Mapped[int] = mapped_column(BigInteger, default=0)
    rating: Mapped[int] = mapped_column(Integer, default=0, comment="1-5，仅书评")
    content: Mapped[str] = mapped_column(Text, default="")
    likes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[int] = mapped_column(Integer, default=0, comment="0 待审 1 通过 2 驳回")
    created_at: Mapped[int] = mapped_column(BigInteger, default=0)


class Review(Base, IdMixin):
    """书评。"""

    __tablename__ = "reviews"
    __table_args__ = (
        Index("idx_reviews_novel_id", "novel_id"),
        Index("idx_reviews_reader_id", "reader_id"),
    )

    reader_id: Mapped[int] = mapped_column(BigInteger)
    novel_id: Mapped[int] = mapped_column(BigInteger)
    rating: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text, default="")
    images: Mapped[str] = mapped_column(String(500), default="")
    likes: Mapped[int] = mapped_column(Integer, default=0)
    replies: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[int] = mapped_column(BigInteger, default=0)


class RewardRecord(Base, IdMixin):
    """打赏记录。"""

    __tablename__ = "reward_records"
    __table_args__ = (
        Index("idx_reward_records_novel_id", "novel_id"),
        Index("idx_reward_records_reader_id", "reader_id"),
    )

    reader_id: Mapped[int] = mapped_column(BigInteger)
    novel_id: Mapped[int] = mapped_column(BigInteger)
    type: Mapped[str] = mapped_column(String(20), comment="ticket/recommend/tip")
    amount: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[int] = mapped_column(BigInteger, default=0)
