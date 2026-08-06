"""审核域 ORM：审核记录 / 历史 / 敏感词库（§4.2.5）。"""

from sqlalchemy import BigInteger, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin


class AuditRecord(Base, IdMixin):
    """审核记录。"""

    __tablename__ = "audit_records"
    __table_args__ = (Index("idx_audit_target", "target_type", "target_id"),)

    target_type: Mapped[str] = mapped_column(String(20), comment="novel/chapter")
    target_id: Mapped[int] = mapped_column(BigInteger)
    level: Mapped[str] = mapped_column(String(20), comment="first/second/final")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    operator_id: Mapped[int] = mapped_column(BigInteger, default=0)
    operator_name: Mapped[str] = mapped_column(String(64), default="")
    comment: Mapped[str] = mapped_column(String(500), default="")
    reject_reason: Mapped[str] = mapped_column(String(32), default="")
    sensitive_hits: Mapped[str] = mapped_column(Text, default="", comment="JSON 快照")
    submitted_at: Mapped[int] = mapped_column(BigInteger, default=0)
    processed_at: Mapped[int] = mapped_column(BigInteger, default=0)


class AuditHistory(Base, IdMixin):
    """审核历史。"""

    __tablename__ = "audit_histories"
    __table_args__ = (Index("idx_audit_history_record_id", "audit_record_id"),)

    audit_record_id: Mapped[int] = mapped_column(BigInteger)
    operator_id: Mapped[int] = mapped_column(BigInteger, default=0)
    operator_name: Mapped[str] = mapped_column(String(64), default="")
    result: Mapped[str] = mapped_column(String(20), comment="approve/revise/reject")
    comment: Mapped[str] = mapped_column(String(500), default="")
    reject_reason: Mapped[str] = mapped_column(String(32), default="")
    created_at: Mapped[int] = mapped_column(BigInteger, default=0)


class SensitiveWord(Base, IdMixin, TimestampMixin):
    """敏感词库。"""

    __tablename__ = "sensitive_words"
    __table_args__ = (UniqueConstraint("text", "level", name="uq_sensitive_text_level"),)

    text: Mapped[str] = mapped_column(String(64))
    level: Mapped[int] = mapped_column(Integer, default=3, comment="1 高危 2 警告 3 提示")
    suggestion: Mapped[str] = mapped_column(String(255), default="")
    lib_version: Mapped[str] = mapped_column(String(20), default="")
