"""枚举定义，全量对齐 @novel/types/enums.ts（附录 A）。"""

from enum import Enum


class BookFlag(str, Enum):
    """内容分级标识。"""

    VIP = "vip"
    FREE_LIMITED = "free-limited"
    EDITOR_PICK = "editor-pick"
    HOT = "hot"


class BookCategory(str, Enum):
    """书籍分类。"""

    XUANHUAN = "xuanhuan"
    XIANXIA = "xianxia"
    URBAN = "urban"
    HISTORY = "history"
    SCIFI = "scifi"
    WUXIA = "wuxia"
    GAME = "game"
    SUSPENSE = "suspense"
    ROMANCE = "romance"
    OTHER = "other"


# 分类中文名映射（附录 B 初始化数据）
BOOK_CATEGORY_LABELS: dict[str, str] = {
    "xuanhuan": "玄幻",
    "xianxia": "仙侠",
    "urban": "都市",
    "history": "历史",
    "scifi": "科幻",
    "wuxia": "武侠",
    "game": "游戏",
    "suspense": "悬疑",
    "romance": "言情",
    "other": "其他",
}


class ContractType(str, Enum):
    """签约模式。"""

    BUYOUT = "buyout"
    SHARE = "share"
    GUARANTEE_SHARE = "guarantee-share"


class SettlementStatus(str, Enum):
    """结算状态。"""

    PENDING = "pending"
    SETTLED = "settled"
    WITHDRAWN = "withdrawn"


class AuditLevel(str, Enum):
    """审核级别。"""

    FIRST = "first"
    SECOND = "second"
    FINAL = "final"


class AuditResult(str, Enum):
    """审核结果。"""

    APPROVE = "approve"
    REVISE = "revise"
    REJECT = "reject"


class RejectReason(str, Enum):
    """驳回原因。"""

    POLITICAL = "political"
    PORNOGRAPHIC = "pornographic"
    VIOLENCE = "violence"
    PLAGIARISM = "plagiarism"
    ADVERTISEMENT = "advertisement"
    OTHER = "other"


class OfflineReason(str, Enum):
    """下架原因。"""

    VIOLATION = "violation"
    COPYRIGHT = "copyright"
    AUTHOR_REQUEST = "author-request"
    OPERATION_ADJUST = "operation-adjust"


class BNovelStatus(str, Enum):
    """B 端作品状态。"""

    DRAFT = "draft"
    PENDING = "pending"
    PUBLISHED = "published"
    OFFLINE = "offline"


class BChapterStatus(str, Enum):
    """B 端章节状态。"""

    DRAFT = "draft"
    PENDING = "pending"
    PUBLISHED = "published"
    OFFLINE = "offline"


class CNovelStatus(str, Enum):
    """C 端作品状态（派生）。"""

    ONGOING = "ongoing"
    COMPLETED = "completed"


class RankType(str, Enum):
    """排行榜类型。"""

    HOT = "hot"
    FOLLOW = "follow"
    TICKET = "ticket"
    NEW = "new"


class SortKey(str, Enum):
    """分类页排序方式。"""

    HOT = "hot"
    FOLLOW = "follow"
    LATEST = "latest"
    COMPLETED = "completed"


class FollowStatus(str, Enum):
    """追更状态。"""

    UPDATED = "updated"
    NONE = "none"
    DONE = "done"


class AdminRole(str, Enum):
    """管理员角色。"""

    SUPER_ADMIN = "super-admin"
    CONTENT_ADMIN = "content-admin"
    OPERATION_ADMIN = "operation-admin"
    FINANCE_ADMIN = "finance-admin"
    AUDITOR = "auditor"


# 角色中文名
ADMIN_ROLE_LABELS: dict[str, str] = {
    "super-admin": "超级管理员",
    "content-admin": "内容管理员",
    "operation-admin": "运营管理员",
    "finance-admin": "财务管理员",
    "auditor": "审核员",
}


class Permission(str, Enum):
    """权限点（19 项，对齐 permissions.ts）。"""

    NOVEL_LIST = "novel.list"
    NOVEL_CREATE = "novel.create"
    NOVEL_EDIT = "novel.edit"
    NOVEL_DELETE = "novel.delete"
    NOVEL_SHELVE = "novel.shelve"
    CHAPTER_LIST = "chapter.list"
    CHAPTER_CREATE = "chapter.create"
    CHAPTER_EDIT = "chapter.edit"
    CHAPTER_DELETE = "chapter.delete"
    AUDIT_LIST = "audit.list"
    AUDIT_APPROVE = "audit.approve"
    AUDIT_REVISE = "audit.revise"
    AUDIT_REJECT = "audit.reject"
    AUTHOR_LIST = "author.list"
    AUTHOR_EDIT = "author.edit"
    ROYALTY_LIST = "royalty.list"
    ROYALTY_EXPORT = "royalty.export"
    USER_LIST = "user.list"
    USER_EDIT = "user.edit"
    PERMISSION_ASSIGN = "permission.assign"
    SYSTEM_CONFIG = "system.config"


ALL_PERMISSIONS: list[str] = [p.value for p in Permission]


# 内置角色-权限映射（对齐 BUILTIN_ROLE_PERMISSIONS）
BUILTIN_ROLE_PERMISSIONS: dict[str, list[str]] = {
    "super-admin": ALL_PERMISSIONS,
    "content-admin": [
        "novel.list",
        "novel.create",
        "novel.edit",
        "chapter.list",
        "chapter.create",
        "chapter.edit",
        "chapter.delete",
        "audit.list",
        "audit.approve",
        "audit.revise",
        "audit.reject",
        "author.list",
    ],
    "operation-admin": [
        "novel.list",
        "novel.shelve",
        "chapter.list",
        "royalty.list",
        "royalty.export",
        "user.list",
        "user.edit",
        "system.config",
    ],
    "finance-admin": [
        "royalty.list",
        "royalty.export",
        "novel.list",
    ],
    "auditor": [
        "audit.list",
        "audit.approve",
        "audit.reject",
        "novel.list",
        "chapter.list",
    ],
}
