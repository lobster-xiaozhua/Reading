"""业务服务层。

聚合领域服务、状态机编排与缓存策略，向上为 API 路由层提供无状态业务能力。
C/B 端共享服务，通过不同的入参与返回 Schema 隔离视图。
"""

from app.services.audit_service import AuditService
from app.services.auth_service import AuthService
from app.services.book_service import BookService
from app.services.chapter_service import ChapterService
from app.services.chart_service import ChartService
from app.services.discovery_service import DiscoveryService
from app.services.interaction_service import InteractionService
from app.services.novel_service import NovelService
from app.services.role_service import RoleService
from app.services.royalty_service import RoyaltyService
from app.services.search_service import SearchService
from app.services.sensitive_service import SensitiveService
from app.services.system_service import SystemService
from app.services.user_center_service import UserCenterService
from app.services.user_service import UserService
from app.services.workbench_service import WorkbenchService

__all__ = [
    "AuditService",
    "AuthService",
    "BookService",
    "ChapterService",
    "ChartService",
    "DiscoveryService",
    "InteractionService",
    "NovelService",
    "RoleService",
    "RoyaltyService",
    "SearchService",
    "SensitiveService",
    "SystemService",
    "UserCenterService",
    "UserService",
    "WorkbenchService",
]
