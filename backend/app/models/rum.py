"""RUM 前端性能 / 错误事件表（匿名埋点，可观测性消费）。"""

from sqlalchemy import Float, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin


class RumEvent(Base, IdMixin, TimestampMixin):
    """前端 RUM 事件（Web Vitals / 运行时错误）。

    字段与 ``app.api.c_end.rum.RumEventBody`` 对齐；``meta`` 以 JSON 字符串存储。
    """

    __tablename__ = "rum_events"
    # 埋点表数据量大，created_at 支撑按时间窗口统计与分页倒序查询
    __table_args__ = (Index("idx_rum_events_created_at", "created_at"),)

    type: Mapped[str] = mapped_column(String(16), default="perf", comment="perf/error")
    name: Mapped[str] = mapped_column(String(64), default="", comment="指标/错误名")
    value: Mapped[float | None] = mapped_column(Float, nullable=True, comment="指标值 ms")
    rating: Mapped[str | None] = mapped_column(String(32), nullable=True, comment="good/needs-improvement/poor")
    message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="错误消息")
    meta: Mapped[str | None] = mapped_column(Text, nullable=True, comment="附加上下文 JSON")
