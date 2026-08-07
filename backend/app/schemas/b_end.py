"""B 端业务 Schema（作品/章节/审核/角色/敏感词/系统/工作台/用户）。"""

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.enums import (
    AuditLevel,
    AuditResult,
    BChapterStatus,
    BNovelStatus,
    BookFlag,
    RejectReason,
)


# ── 作品管理 ────────────────────────────────────────────
class BNovelDetail(CamelModel):
    id: str
    title: str
    author_id: str = ""
    author: str = ""
    category: str = ""
    cover: str = ""
    intro: str = ""
    word_count: int = 0
    status: BNovelStatus = BNovelStatus.DRAFT
    flags: list[BookFlag] = []
    tags: list[str] = []
    rating: float = 0.0
    rating_count: int = 0
    follow_count: int = 0
    click_count: int = 0
    chapter_count: int = 0
    price: float = 0.0
    author_remark: str = ""
    published_at: int = 0
    shelved_at: int = 0
    offline_reason: str = ""
    offline_remark: str = ""
    created_at: int = 0
    updated_at: int = 0
    last_updated: int = 0
    is_completed: bool = False


class NovelListParams(CamelModel):
    page: int = 1
    page_size: int = 20
    search_key: str = ""
    status: str = "all"
    category: str = "all"
    date_range: list[int] | None = None


class NovelListResponse(CamelModel):
    items: list[BNovelDetail] = Field(default_factory=list, alias="list")
    total: int = 0
    page: int = 1
    page_size: int = 20

    model_config = {"populate_by_name": True}


class NovelSubmitBody(CamelModel):
    title: str
    author_id: str = ""
    category: str = "other"
    cover: str = ""
    intro: str = ""
    flags: list[BookFlag] = []
    price: float = 0.0
    author_remark: str = ""
    is_completed: bool = False


class NovelBatchOperateBody(CamelModel):
    ids: list[int] = []
    action: str = "submit-audit"
    reason: str = ""
    comment: str = ""


class BatchOperateResponse(CamelModel):
    success: bool = True
    failed: list[dict] | None = None


# ── 章节管理 ────────────────────────────────────────────
class BChapterListItem(CamelModel):
    id: str
    novel_id: str
    index: int
    title: str
    word_count: int = 0
    pure_word_count: int = 0
    punctuation_word_count: int = 0
    status: BChapterStatus = BChapterStatus.DRAFT
    audit_level: str = "first"
    is_vip: bool = False
    published_at: int = 0
    created_at: int = 0
    updated_at: int = 0


class BChapterDetail(BChapterListItem):
    content: str = ""


class BChapterListResponse(CamelModel):
    """章节分页列表响应（对齐前端 ChapterListResponse）。"""

    items: list[BChapterListItem] = Field(default_factory=list, serialization_alias="list")
    total: int = 0
    page: int = 1
    pageSize: int = 20
    totalWords: int = 0
    novelStatus: str = "published"


class ChapterSubmitBody(CamelModel):
    novel_id: str
    title: str
    content: str = ""
    is_vip: bool = False
    audit_level: str = "first"


class ChapterUpdateBody(CamelModel):
    title: str | None = None
    content: str | None = None
    is_vip: bool | None = None


class ChapterReorderBody(CamelModel):
    ordered_ids: list[str] = []


class ChapterTransitionBody(CamelModel):
    target: str


class ChapterBatchOperateBody(CamelModel):
    ids: list[int] = []
    action: str = "submit"


# ── 内容审核 ────────────────────────────────────────────
class SensitiveCheckBody(CamelModel):
    text: str = ""


class SensitiveHit(CamelModel):
    text: str = ""
    level: int = 3
    offset: int = 0
    suggestion: str = ""


class AuditItem(CamelModel):
    id: str
    target_type: str
    target_id: str
    level: AuditLevel = AuditLevel.FIRST
    status: str = "pending"
    target_title: str = ""
    chapter_title: str = ""
    novel_title: str = ""
    author: str = ""
    content: str = ""
    word_count: int = 0
    sensitive_hits: list[SensitiveHit] = []
    submitted_at: int = 0
    processed_at: int = 0


class AuditQueueStats(CamelModel):
    pending_count: int = 0
    today_processed: int = 0
    by_level: dict[str, int] = {}


class AuditQueueResponse(CamelModel):
    items: list[AuditItem] = Field(default_factory=list, alias="list")
    stats: AuditQueueStats = AuditQueueStats()


class AuditSubmitBody(CamelModel):
    ids: list[str] = []
    result: AuditResult
    comment: str = ""
    reject_reason: RejectReason | None = None


class AuditHistoryItem(CamelModel):
    id: str
    operator_name: str = ""
    result: str = ""
    comment: str = ""
    reject_reason: str = ""
    created_at: int = 0


class AuditSubmitResult(CamelModel):
    success: bool = True
    next_id: str | None = None
    failed: list[dict] | None = None


# ── 角色权限 ────────────────────────────────────────────
class PermissionItem(CamelModel):
    key: str
    label: str
    module: str
    description: str = ""


class RoleItem(CamelModel):
    role_key: str
    name: str
    description: str = ""
    data_scope: str = "all"
    builtin: bool = False
    user_count: int = 0


class RoleDetail(RoleItem):
    permissions: list[str] = []


class UpdateRolePermissionsBody(CamelModel):
    permissions: list[str] = []


class UpdateRoleMetaBody(CamelModel):
    name: str | None = None
    description: str | None = None
    data_scope: str | None = None


# ── 敏感词 ──────────────────────────────────────────────
class SensitiveWordItem(CamelModel):
    id: str
    text: str
    level: int = 3
    suggestion: str = ""
    lib_version: str = ""


class SensitiveWordLibMeta(CamelModel):
    version: str = ""
    updated_at: int = 0
    total_count: int = 0
    by_level: dict[str, int] = {}


class SensitiveWordLib(CamelModel):
    words: list[SensitiveWordItem] = []
    meta: SensitiveWordLibMeta = SensitiveWordLibMeta()


class AddSensitiveWordBody(CamelModel):
    text: str
    level: int = 3
    suggestion: str = ""


# ── 系统设置 ────────────────────────────────────────────
class SystemConfig(CamelModel):
    site_name: str = "小说阅读平台"
    icp: str = ""
    sensitive_word_lib_version: str = ""
    version: str = "2.1.0"


# ── 工作台 ──────────────────────────────────────────────
class WorkbenchKpi(CamelModel):
    total_novels: int = 0
    published_novels: int = 0
    pending_audit: int = 0
    total_authors: int = 0
    total_readers: int = 0
    today_revenue: float = 0.0


# ── 用户管理 ────────────────────────────────────────────
class UserListItem(CamelModel):
    id: str
    username: str
    nickname: str = ""
    avatar: str = ""
    level: int = 1
    is_vip: bool = False
    status: int = 1
    created_at: int = 0


__all__ = [
    "AddSensitiveWordBody",
    "AuditHistoryItem",
    "AuditItem",
    "AuditQueueResponse",
    "AuditQueueStats",
    "AuditSubmitBody",
    "AuditSubmitResult",
    "BChapterDetail",
    "BChapterListItem",
    "BNovelDetail",
    "BatchOperateResponse",
    "ChapterBatchOperateBody",
    "ChapterReorderBody",
    "ChapterSubmitBody",
    "ChapterTransitionBody",
    "ChapterUpdateBody",
    "NovelBatchOperateBody",
    "NovelListParams",
    "NovelListResponse",
    "NovelSubmitBody",
    "PermissionItem",
    "RoleDetail",
    "RoleItem",
    "SensitiveHit",
    "SensitiveWordItem",
    "SensitiveWordLib",
    "SensitiveWordLibMeta",
    "SystemConfig",
    "UpdateRoleMetaBody",
    "UpdateRolePermissionsBody",
    "UserListItem",
    "WorkbenchKpi",
]
