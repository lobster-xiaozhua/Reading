"""ORM 基类与公共 Mixin（§4.2 命名规范）。

主键统一 ``id BIGINT``；时间字段统一 ``BIGINT`` 毫秒时间戳（对齐前端 number）；
软删除统一 ``deleted``。
"""

import time

from sqlalchemy import BigInteger, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# SQLite 自动递增仅支持 INTEGER PRIMARY KEY；通过 variant 在 SQLite 下退化为 INTEGER。
_bigint_pk = BigInteger().with_variant(Integer, "sqlite")


class Base(DeclarativeBase):
    """所有 ORM 模型的基类。"""


class IdMixin:
    """自增整型主键。"""

    id: Mapped[int] = mapped_column(_bigint_pk, primary_key=True, autoincrement=True)


class TimestampMixin:
    """创建/更新时间戳（毫秒）。"""

    created_at: Mapped[int] = mapped_column(BigInteger, default=lambda: int(time.time() * 1000))
    updated_at: Mapped[int] = mapped_column(
        BigInteger,
        default=lambda: int(time.time() * 1000),
        onupdate=lambda: int(time.time() * 1000),
    )


class SoftDeleteMixin:
    """软删除标记：0 正常 / 1 已删除。"""

    deleted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
