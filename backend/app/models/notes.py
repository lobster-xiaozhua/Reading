"""笔记域 ORM：读者笔记（选词笔记）。"""

from sqlalchemy import BigInteger, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin


class ReaderNote(Base, IdMixin):
    """读者笔记（选词笔记）。"""

    __tablename__ = "reader_notes"

    reader_id: Mapped[int] = mapped_column(BigInteger, index=True)
    novel_id: Mapped[int] = mapped_column(BigInteger)
    chapter_id: Mapped[int] = mapped_column(BigInteger)
    text: Mapped[str] = mapped_column(String(500), comment="选中的原文文本")
    paragraph_index: Mapped[int] = mapped_column(Integer, default=0, comment="段落索引")
    offset_start: Mapped[int] = mapped_column(Integer, default=0, comment="选中起始位置")
    offset_end: Mapped[int] = mapped_column(Integer, default=0, comment="选中结束位置")
    annotation: Mapped[str] = mapped_column(Text, default="", comment="读者笔记内容")
    created_at: Mapped[int] = mapped_column(BigInteger, default=0)
    updated_at: Mapped[int] = mapped_column(BigInteger, default=0)
