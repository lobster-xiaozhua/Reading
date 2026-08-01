"""数据访问层导出。"""

from app.repositories.audit_repo import AuditRepository, SensitiveWordRepository
from app.repositories.base import BaseRepository
from app.repositories.chapter_repo import ChapterRepository
from app.repositories.interaction_repo import (
    CommentRepository,
    ReviewRepository,
    RewardRepository,
)
from app.repositories.novel_repo import NovelRepository
from app.repositories.reader_repo import (
    BookshelfRepository,
    ReaderRepository,
    ReadingHistoryRepository,
    ReadingStatsRepository,
)
from app.repositories.role_repo import PermissionRepository, RoleRepository
from app.repositories.royalty_repo import RoyaltyRepository

__all__ = [
    "AuditRepository",
    "BaseRepository",
    "BookshelfRepository",
    "ChapterRepository",
    "CommentRepository",
    "NovelRepository",
    "PermissionRepository",
    "ReaderRepository",
    "ReadingHistoryRepository",
    "ReadingStatsRepository",
    "ReviewRepository",
    "RewardRepository",
    "RoleRepository",
    "RoyaltyRepository",
    "SensitiveWordRepository",
]
