"""用户域 ORM：作者 / 读者 / 管理员（§4.2.1）。"""

from sqlalchemy import BigInteger, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, SoftDeleteMixin, TimestampMixin


class Author(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    """作者表。"""

    __tablename__ = "authors"

    pen_name: Mapped[str] = mapped_column(String(64))
    real_name: Mapped[str] = mapped_column(String(64), default="")
    avatar: Mapped[str] = mapped_column(String(255), default="")
    contract_type: Mapped[str] = mapped_column(String(20), default="buyout")
    contract_rate: Mapped[float] = mapped_column(default=0.0)
    status: Mapped[int] = mapped_column(Integer, default=0, comment="0 待签 1 已签 2 解约")


class Reader(Base, IdMixin, TimestampMixin, SoftDeleteMixin):
    """读者表。"""

    __tablename__ = "readers"

    username: Mapped[str] = mapped_column(String(64), unique=True)
    nickname: Mapped[str] = mapped_column(String(64), default="")
    avatar: Mapped[str] = mapped_column(String(255), default="")
    bio: Mapped[str] = mapped_column(String(255), default="")
    password_hash: Mapped[str] = mapped_column(String(128), default="")
    phone: Mapped[str] = mapped_column(String(20), default="")
    level: Mapped[int] = mapped_column(Integer, default=1)
    is_vip: Mapped[int] = mapped_column(Integer, default=0)
    vip_expire_at: Mapped[int] = mapped_column(BigInteger, default=0)
    total_reading_minutes: Mapped[int] = mapped_column(Integer, default=0)
    total_read_words: Mapped[int] = mapped_column(BigInteger, default=0)
    reading_days: Mapped[int] = mapped_column(Integer, default=0)


class Admin(Base, IdMixin, TimestampMixin):
    """管理员表。"""

    __tablename__ = "admins"

    username: Mapped[str] = mapped_column(String(64), unique=True)
    nickname: Mapped[str] = mapped_column(String(64), default="")
    avatar: Mapped[str] = mapped_column(String(255), default="")
    email: Mapped[str] = mapped_column(String(128), default="")
    password_hash: Mapped[str] = mapped_column(String(128), default="")
    role_key: Mapped[str] = mapped_column(String(32), default="super-admin", comment="关联 roles 表")
    enabled: Mapped[int] = mapped_column(Integer, default=1)
    last_login_at: Mapped[int] = mapped_column(BigInteger, default=0)
