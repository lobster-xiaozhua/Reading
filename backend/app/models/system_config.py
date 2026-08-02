from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class SystemConfigModel(Base, TimestampMixin):
    """系统配置表（单行设计）。"""

    __tablename__ = "system_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    site_name: Mapped[str] = mapped_column(String(128), default="小说阅读平台")
    icp: Mapped[str] = mapped_column(String(64), default="")