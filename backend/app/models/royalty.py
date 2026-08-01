"""稿费域 ORM：稿费明细（§4.2.6）。"""

from sqlalchemy import BigInteger, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin


class RoyaltyDetail(Base, IdMixin):
    """稿费明细。"""

    __tablename__ = "royalty_details"

    month: Mapped[str] = mapped_column(String(7), comment="YYYY-MM", index=True)
    novel_id: Mapped[int] = mapped_column(BigInteger)
    author_id: Mapped[int] = mapped_column(BigInteger)
    chapter_count: Mapped[int] = mapped_column(Integer, default=0)
    word_count: Mapped[int] = mapped_column(Integer, default=0, comment="含标点字数")
    contract_type: Mapped[str] = mapped_column(String(20), default="buyout")
    rate: Mapped[float] = mapped_column(Numeric(10, 4), default=0.0)
    subscription_revenue: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    settled_at: Mapped[int] = mapped_column(BigInteger, default=0)
    withdrawn_at: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[int] = mapped_column(BigInteger, default=0)
