/* ============================================================
 * P5 · 数据模型类型定义
 * 与 Mock fetcher 对齐，后续可平替为真实 API
 * ============================================================ */

/** 书籍状态 */
export type BookStatus = 'ongoing' | 'completed';

/** 内容分级（用于 VIP/限免标识） */
export type BookFlag = 'vip' | 'free-limited' | 'editor-pick' | 'hot';

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
