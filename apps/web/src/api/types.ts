/* ============================================================
 * P5 · 数据模型类型定义
 * 与 Mock fetcher 对齐，后续可平替为真实 API
 * ============================================================ */

/** 书籍状态 */
export type BookStatus = 'ongoing' | 'completed';

/** 内容分级（用于 VIP/限免标识） */
export type BookFlag = 'vip' | 'free-limited' | 'editor-pick' | 'hot';

/** 发现页聚合数据 */
export interface DiscoverHome {
  banners: Banner[];
  hotBooks: BookSummary[];
  freeBooks: BookSummary[];
  editorPicks: BookSummary[];
  categories: Category[];
  rankings: Record<RankType, BookSummary[]>;
}

/** 书籍摘要（列表/卡片用） */
export interface BookSummary {
  id: string;
  title: string;
  author: string;
  cover: string;
  category: string;
  tags: string[];
  wordCount: number;
  status: BookStatus;
  rating: number;
  ratingCount: number;
  followCount: number;
  clickCount: number;
  intro: string;
  flags: BookFlag[];
  /** 最近更新时间戳（ms） */
  lastUpdated: number;
  /** 限免截止时间戳（ms），缺失时前端降级为「限免中」 */
  freeDeadline?: number;
}

/** 章节摘要（目录用） */
export interface ChapterSummary {
  id: string;
  bookId: string;
  index: number;
  title: string;
  wordCount: number;
  isVip: boolean;
  publishedAt: number;
}

/** 章节正文 */
export interface ChapterContent {
  id: string;
  bookId: string;
  index: number;
  title: string;
  wordCount: number;
  isVip: boolean;
  publishedAt: number;
  paragraphs: string[];
  /** 上一章 id（首章为 null） */
  prevId: string | null;
  /** 下一章 id（末章为 null） */
  nextId: string | null;
}

/** 分类节点 */
export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
  children?: Category[];
}

/** 标签 */
export interface Tag {
  id: string;
  name: string;
  count: number;
}

/** 排行榜类型 */
export type RankType = 'hot' | 'follow' | 'ticket' | 'new';

/** 排序方式 */
export type SortKey = 'hot' | 'follow' | 'latest' | 'completed';

/** 用户信息 */
export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  bio?: string;
  level: number;
  isVip: boolean;
  vipExpireAt?: number;
  stats: {
    readingDays: number;
    readingMinutes: number;
    readWords: number;
    bookshelfCount: number;
  };
}

/** 书架分组 */
export type BookshelfTab = 'all' | 'ongoing' | 'completed' | 'recent';

/** 阅读历史项 */
export interface ReadingHistoryItem {
  bookId: string;
  book: BookSummary;
  chapterId: string;
  chapterTitle: string;
  chapterIndex: number;
  percent: number;
  readAt: number;
}

/** 书单 */
export interface BookList {
  id: string;
  title: string;
  desc: string;
  cover: string;
  bookCount: number;
  followCount: number;
  createdAt: number;
}

/** 评论 */
export interface Comment {
  id: string;
  bookId: string;
  user: { id: string; nickname: string; avatar: string };
  rating: number;
  content: string;
  likes: number;
  createdAt: number;
  replies?: Comment[];
}

/** 评分分布 */
export interface RatingDistribution {
  total: number;
  average: number;
  buckets: { star: number; count: number; percent: number }[];
}

/** 打赏记录 */
export interface RewardRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  type: 'ticket' | 'recommend' | 'tip';
  amount: number;
  createdAt: number;
}

/** 搜索建议 */
export interface SearchSuggestion {
  type: 'book' | 'author' | 'tag';
  text: string;
  bookId?: string;
}

/** 分页结果 */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Banner */
export interface Banner {
  id: string;
  bookId: string;
  title: string;
  subtitle: string;
  cover: string;
  accent: string;
}

/* ============================================================
 * P6 · 扩展数据模型
 * ============================================================ */

/** 排行榜项（含排名变化） */
export interface RankItem {
  book: BookSummary;
  rank: number;
  prevRank: number;
}

/** 推荐书籍（含匹配度） */
export interface RecommendBook {
  book: BookSummary;
  matchScore: number;
}

/** 话题 */
export interface Topic {
  id: string;
  name: string;
  count: number;
}

/** 书评 */
export interface Review {
  id: string;
  user: { id: string; nickname: string; avatar: string };
  book: { id: string; title: string; cover: string };
  rating: number;
  content: string;
  images?: string[];
  likes: number;
  replies: number;
  liked?: boolean;
  createdAt: number;
}

/** 阅读统计概览 */
export interface ReadingStatOverview {
  weeklyDuration: number;
  totalWords: number;
  streakDays: number;
}

/** 热力图格子 */
export interface HeatmapCell {
  date: string;
  duration: number;
}

/** 阅读偏好项 */
export interface PreferenceItem {
  category: string;
  percent: number;
  words: number;
}

/** 徽章 */
export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  unlocked: boolean;
}

/** VIP 套餐 */
export interface VipPlan {
  id: string;
  name: string;
  pricePerMonth: number;
  originalPrice: number;
  totalPrice: number;
  discount: string;
  expired?: boolean;
  recommended?: boolean;
}

/** 支付方式 */
export interface PaymentMethodItem {
  id: string;
  name: string;
  icon: string;
}

/** 追更项状态 */
export type FollowStatus = 'updated' | 'none' | 'done';

/** 追更项 */
export interface FollowItem {
  bookId: string;
  cover: string;
  title: string;
  author?: string;
  latestChapterTitle: string;
  latestTime: number;
  status: FollowStatus;
  unreadCount: number;
  finished: boolean;
}

