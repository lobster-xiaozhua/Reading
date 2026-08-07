"""VIP 套餐 / 支付相关 ORM。"""

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin


class VipPlanModel(Base, IdMixin, TimestampMixin):
    """VIP 套餐表。"""

    __tablename__ = "vip_plans"

    plan_id: Mapped[str] = mapped_column(String(32), unique=True, comment="套餐标识 monthly/quarterly/yearly")
    name: Mapped[str] = mapped_column(String(32), comment="显示名称")
    price_per_month: Mapped[float] = mapped_column(Float, default=0.0)
    original_price: Mapped[float] = mapped_column(Float, default=0.0)
    total_price: Mapped[float] = mapped_column(Float, default=0.0)
    discount: Mapped[str] = mapped_column(String(16), default="")
    recommended: Mapped[int] = mapped_column(Integer, default=0)
    sort: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[int] = mapped_column(Integer, default=1)
