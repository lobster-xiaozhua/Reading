"""ORM 模型包。导入所有模型以便 Alembic 与 ``Base.metadata`` 发现。"""

from app.models.audit import AuditHistory, AuditRecord, SensitiveWord
from app.models.base import Base, IdMixin, SoftDeleteMixin, TimestampMixin
from app.models.interaction import Comment, CommentLike, NovelRating, Review, RewardRecord
from app.models.notes import ReaderNote
from app.models.novel import Banner, Category, Chapter, Novel, Tag
from app.models.permission import Permission as PermissionModel
from app.models.permission import Role, RolePermission
from app.models.reading import (
    Bookshelf,
    ReadingHistory,
    ReadingStatsDaily,
)
from app.models.royalty import RoyaltyDetail
from app.models.rum import RumEvent
from app.models.system_config import SystemConfigModel
from app.models.user import Admin, Author, Reader
from app.models.vip import VipPlanModel

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
    "CommentLike",
    "IdMixin",
    "Novel",
    "NovelRating",
    "PermissionModel",
    "Reader",
    "ReadingHistory",
    "ReadingStatsDaily",
    "Review",
    "RewardRecord",
    "Role",
    "RolePermission",
    "RoyaltyDetail",
    "RumEvent",
    "SensitiveWord",
    "SoftDeleteMixin",
    "SystemConfigModel",
    "Tag",
    "TimestampMixin",
    "VipPlanModel",
]
