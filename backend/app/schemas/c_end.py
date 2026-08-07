"""C 端 Schema，逐字段对齐 apps/web/src/api/types.ts。"""

from app.schemas.common import CamelModel
from app.schemas.enums import BookFlag, CNovelStatus, FollowStatus, RankType, SortKey


class BookSummary(CamelModel):
    """书籍摘要（列表/卡片用）。"""

    id: str
    title: str
    author: str
    cover: str = ""
    category: str = ""
    tags: list[str] = []
    word_count: int = 0
    status: CNovelStatus = CNovelStatus.ONGOING
    rating: float = 0.0
    rating_count: int = 0
    follow_count: int = 0
    click_count: int = 0
    intro: str = ""
    flags: list[BookFlag] = []
    last_updated: int = 0


class ChapterListItem(CamelModel):
    """章节摘要（目录用）。"""

    id: str
    book_id: str
    index: int
    title: str
    word_count: int
    is_vip: bool
    published_at: int = 0


class ChapterContent(CamelModel):
    """章节正文。"""

    id: str
    book_id: str
    index: int
    title: str
    word_count: int
    is_vip: bool
    published_at: int = 0
    paragraphs: list[str] = []
    prev_id: str | None = None
    next_id: str | None = None


class CategoryNode(CamelModel):
    """分类节点。"""

    id: str
    name: str
    icon: str = ""
    count: int = 0
    children: list["CategoryNode"] | None = None


class TagItem(CamelModel):
    id: str
    name: str
    count: int = 0


class Banner(CamelModel):
    id: str
    book_id: str
    title: str
    subtitle: str = ""
    cover: str = ""
    accent: str = "#245BFF"


class RankItem(CamelModel):
    book: BookSummary
    rank: int
    prev_rank: int = 0


class RecommendBook(CamelModel):
    book: BookSummary
    match_score: int = 0


class Topic(CamelModel):
    id: str
    name: str
    count: int = 0


class BookList(CamelModel):
    id: str
    title: str
    desc: str = ""
    cover: str = ""
    book_count: int = 0
    follow_count: int = 0
    created_at: int = 0


class UserProfileStats(CamelModel):
    reading_days: int = 0
    reading_minutes: int = 0
    read_words: int = 0
    bookshelf_count: int = 0


class UserProfile(CamelModel):
    id: str
    nickname: str
    avatar: str = ""
    level: int = 1
    is_vip: bool = False
    vip_expire_at: int | None = None
    stats: UserProfileStats = UserProfileStats()


class CommentUser(CamelModel):
    id: str
    nickname: str
    avatar: str = ""


class Comment(CamelModel):
    id: str
    book_id: str
    user: CommentUser
    rating: int = 0
    content: str = ""
    likes: int = 0
    created_at: int = 0
    replies: list["Comment"] | None = None


class ReviewBookRef(CamelModel):
    id: str
    title: str
    cover: str = ""


class Review(CamelModel):
    id: str
    user: CommentUser
    book: ReviewBookRef
    rating: int = 0
    content: str = ""
    images: list[str] | None = None
    likes: int = 0
    replies: int = 0
    liked: bool | None = None
    created_at: int = 0


class RatingBucket(CamelModel):
    star: int
    count: int
    percent: float


class RatingDistribution(CamelModel):
    total: int
    average: float
    buckets: list[RatingBucket] = []


class RewardRecord(CamelModel):
    id: str
    book_id: str
    book_title: str
    type: str
    amount: int
    created_at: int = 0


class SearchSuggestion(CamelModel):
    type: str
    text: str
    book_id: str | None = None


class ReadingHistoryItem(CamelModel):
    book_id: str
    book: BookSummary
    chapter_id: str
    chapter_title: str
    chapter_index: int
    percent: float
    read_at: int


class ReadingStatOverview(CamelModel):
    weekly_duration: int = 0
    total_words: int = 0
    streak_days: int = 0
    # 兼容文档 §7.5 概览字段
    total_reading_minutes: int = 0
    total_read_words: int = 0
    reading_days: int = 0
    current_streak: int = 0
    longest_streak: int = 0


class HeatmapCell(CamelModel):
    date: str
    duration: int


class PreferenceItem(CamelModel):
    category: str
    percent: float = 0.0
    words: int = 0


class Badge(CamelModel):
    id: str
    name: str
    desc: str = ""
    icon: str = ""
    unlocked: bool = False
    # 扩展：进度信息
    progress: int = 0
    threshold: int = 0


class VipPlan(CamelModel):
    id: str
    name: str
    price_per_month: float
    original_price: float
    total_price: float
    discount: str = ""
    expired: bool | None = None
    recommended: bool | None = None


class PaymentMethodItem(CamelModel):
    id: str
    name: str
    icon: str = ""


class FollowItem(CamelModel):
    book_id: str
    cover: str = ""
    title: str
    latest_chapter_title: str = ""
    latest_time: int = 0
    status: FollowStatus = FollowStatus.NONE
    unread_count: int = 0
    finished: bool = False


class BookshelfItem(CamelModel):
    """书架项（含阅读进度）。"""

    book: BookSummary
    added_at: int = 0
    last_read_chapter_index: int = 0
    percent: float = 0.0


class NoteItem(CamelModel):
    """读者笔记项。"""

    id: str
    novel_id: int = 0
    chapter_id: int = 0
    text: str = ""
    paragraph_index: int = 0
    offset_start: int = 0
    offset_end: int = 0
    annotation: str = ""
    created_at: int = 0
    updated_at: int = 0


class NoteCreateBody(CamelModel):
    """创建笔记请求体。"""

    novel_id: int
    chapter_id: int
    text: str
    paragraph_index: int = 0
    offset_start: int = 0
    offset_end: int = 0
    annotation: str = ""


class NoteUpdateBody(CamelModel):
    """更新笔记请求体。"""

    annotation: str | None = None


class DiscoverHome(CamelModel):
    """发现页聚合数据。"""

    banners: list[Banner] = []
    hot_books: list[BookSummary] = []
    free_books: list[BookSummary] = []
    editor_picks: list[RecommendBook] = []
    categories: list[CategoryNode] = []
    rankings: dict[str, list[RankItem]] = {}


class BookDetailResponse(CamelModel):
    """书籍详情页聚合响应（一次返回书籍+章节+评分，减少网络往返）。"""

    book: BookSummary | None = None
    chapters: list[ChapterListItem] = []
    rating: RatingDistribution | None = None


# 显式再导出枚举，便于路由层引用
__all__ = [
    "Badge",
    "Banner",
    "BookDetailResponse",
    "BookList",
    "BookSummary",
    "BookshelfItem",
    "CategoryNode",
    "ChapterContent",
    "ChapterListItem",
    "Comment",
    "CommentUser",
    "DiscoverHome",
    "FollowItem",
    "HeatmapCell",
    "PaymentMethodItem",
    "PreferenceItem",
    "RankItem",
    "RankType",
    "RatingBucket",
    "RatingDistribution",
    "ReadingHistoryItem",
    "ReadingStatOverview",
    "RecommendBook",
    "Review",
    "ReviewBookRef",
    "RewardRecord",
    "SearchSuggestion",
    "SortKey",
    "TagItem",
    "Topic",
    "UserProfile",
    "UserProfileStats",
    "VipPlan",
]
