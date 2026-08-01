"""权限域 ORM：角色 / 权限点 / 角色-权限（§4.2.7）。"""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Role(Base):
    """角色表（role_key 为主键）。"""

    __tablename__ = "roles"

    role_key: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(32), default="")
    description: Mapped[str] = mapped_column(String(255), default="")
    data_scope: Mapped[str] = mapped_column(String(20), default="all")
    builtin: Mapped[int] = mapped_column(Integer, default=1)
    user_count: Mapped[int] = mapped_column(Integer, default=0)


class Permission(Base):
    """权限点表（perm_key 为主键）。"""

    __tablename__ = "permissions"

    perm_key: Mapped[str] = mapped_column(String(32), primary_key=True)
    label: Mapped[str] = mapped_column(String(32), default="")
    module: Mapped[str] = mapped_column(String(20), default="")
    description: Mapped[str] = mapped_column(String(255), default="")


class RolePermission(Base):
    """角色-权限关联（复合主键）。"""

    __tablename__ = "role_permissions"

    role_key: Mapped[str] = mapped_column(String(32), primary_key=True)
    perm_key: Mapped[str] = mapped_column(String(32), primary_key=True)
