"""ORM 模型包。导入所有模型以便 Alembic 与 ``Base.metadata`` 发现。"""

from app.models.audit import AuditHistory, AuditRecord, SensitiveWord
from app.models.base import Base, IdMixin, SoftDeleteMixin, TimestampMixin
from app.models.interaction import Comment, Review, RewardRecord
from app.models.novel import Banner, Category, Chapter, Novel, Tag
from app.models.permission import Permission as PermissionModel
from app.models.permission import Role, RolePermission
from app.models.reading import (
    Bookshelf,
    ReadingHistory,
    ReadingStatsDaily,
)
from app.models.royalty import RoyaltyDetail
from app.models.system_config import SystemConfigModel
from app.models.user import Admin, Author, Reader

__all__ = [
    "Admin",
    "AuditHistory",
    "AuditRecord",
    "Author",
    "Banner",
    "Base",
    "Bookshelf",
    "Category",
    "Chapter",
    "Comment",
    "IdMixin",
    "Novel",
    "PermissionModel",
    "Reader",
    "ReadingHistory",
    "ReadingStatsDaily",
    "Review",
    "RewardRecord",
    "Role",
    "RolePermission",
    "RoyaltyDetail",
    "SensitiveWord",
    "SystemConfigModel",
    "SoftDeleteMixin",
    "Tag",
    "TimestampMixin",
]
