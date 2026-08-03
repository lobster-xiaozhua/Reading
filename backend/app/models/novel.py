"""内容域 ORM：小说 / 章节 / 标签 / 分类 / Banner（§4.2.2）。"""

from sqlalchemy import BigInteger, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, SoftDeleteMixin, TimestampMixin


class Novel(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    """小说表。"""

    __tablename__ = "novels"
    __table_args__ = (
        Index("idx_novels_status_updated", "status", "updated_at"),
        Index("idx_novels_category", "category"),
    )

    title: Mapped[str] = mapped_column(String(128))
    author_id: Mapped[int] = mapped_column(BigInteger, default=0)
    author_name: Mapped[str] = mapped_column(String(64), default="")
    cover: Mapped[str] = mapped_column(String(255), default="")
    category: Mapped[str] = mapped_column(String(20), default="other")
    intro: Mapped[str] = mapped_column(Text, default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    flags: Mapped[str] = mapped_column(String(100), default="")
    rating: Mapped[float] = mapped_column(Numeric(3, 1), default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    follow_count: Mapped[int] = mapped_column(Integer, default=0)
    click_count: Mapped[int] = mapped_column(Integer, default=0)
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    author_remark: Mapped[str] = mapped_column(String(500), default="")
    published_at: Mapped[int] = mapped_column(BigInteger, default=0)
    shelved_at: Mapped[int] = mapped_column(BigInteger, default=0)
    offline_reason: Mapped[str] = mapped_column(String(32), default="")
    offline_remark: Mapped[str] = mapped_column(String(500), default="")
    is_completed: Mapped[int] = mapped_column(Integer, default=0, comment="0 连载中 1 完结")
    tags_str: Mapped[str] = mapped_column(String(200), default="", comment="逗号分隔标签")


class Chapter(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    """章节表。"""

    __tablename__ = "chapters"
    __table_args__ = (
        Index("idx_chapters_novel_index", "novel_id", "index", unique=True),
        Index("idx_chapters_status", "status", "audit_level"),
    )

    novel_id: Mapped[int] = mapped_column(BigInteger)
    index: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(128))
    content: Mapped[str] = mapped_column(Text, default="")
    content_text: Mapped[str] = mapped_column(Text, default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    pure_word_count: Mapped[int] = mapped_column(Integer, default=0)
    punctuation_word_count: Mapped[int] = mapped_column(Integer, default=0)
    is_vip: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    audit_level: Mapped[str] = mapped_column(String(20), default="first")
    published_at: Mapped[int] = mapped_column(BigInteger, default=0)


class Tag(Base, IdMixin):
    """标签表。"""

    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(32), unique=True)
    ref_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[int] = mapped_column(BigInteger, default=0)


class Category(Base, IdMixin):
    """分类表。"""

    __tablename__ = "categories"

    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(32))
    icon: Mapped[str] = mapped_column(String(255), default="")
    parent_id: Mapped[int] = mapped_column(BigInteger, default=0)
    sort: Mapped[int] = mapped_column(Integer, default=0)
    novel_count: Mapped[int] = mapped_column(Integer, default=0)


class Banner(Base, IdMixin):
    """轮播图。"""

    __tablename__ = "banners"

    book_id: Mapped[str] = mapped_column(String(32), default="")
    title: Mapped[str] = mapped_column(String(128), default="")
    subtitle: Mapped[str] = mapped_column(String(255), default="")
    cover: Mapped[str] = mapped_column(String(255), default="")
    accent: Mapped[str] = mapped_column(String(20), default="#245BFF")
    sort: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[int] = mapped_column(BigInteger, default=0)
