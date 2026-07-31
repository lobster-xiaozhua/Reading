/* ============================================================
 * P5 · Mock fetcher 接口
 * 模拟网络延迟，所有页面通过此层调用，后续可平替为真实 API
 * ============================================================ */
import {
  BANNERS,
  BOOKS,
  BOOK_LISTS,
  CATEGORIES,
  CHAPTERS,
  COMMENTS,
  CURRENT_USER,
  getChapterContent,
  getRatingDistribution,
  READING_HISTORY,
  REWARD_RECORDS,
  TAGS,
  HOT_SEARCHES,
  RANKINGS,
  RECOMMENDATIONS,
  TOPICS,
  REVIEWS,
  READING_STAT_OVERVIEW,
  HEATMAP,
  PREFERENCES,
  BADGES,
  VIP_PLANS,
  PAYMENT_METHODS,
  FOLLOW_LIST,
} from './mockData';
import type {
  Banner,
  Badge,
  BookList,
  BookSummary,
  Category,
  ChapterContent,
  ChapterSummary,
  Comment,
  FollowItem,
  HeatmapCell,
  PaymentMethodItem,
  PagedResult,
  PreferenceItem,
  RankItem,
  RatingDistribution,
  ReadingHistoryItem,
  ReadingStatOverview,
  RecommendBook,
  RewardRecord,
  Review,
  SearchSuggestion,
  SortKey,
  Tag,
  Topic,
  UserProfile,
  VipPlan,
} from './types';

/** 模拟网络延迟 */
function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export const fetcher = {
  /* ---------- 发现页 ---------- */
  async getBanners(): Promise<Banner[]> {
    return delay(BANNERS, 100);
  },

  async getHotBooks(): Promise<BookSummary[]> {
    return delay(BOOKS.filter((b) => b.flags.includes('hot')), 150);
  },

  async getFreeLimitedBooks(): Promise<BookSummary[]> {
    return delay(BOOKS.filter((b) => b.flags.includes('free-limited')), 150);
  },

  async getEditorPicks(): Promise<BookSummary[]> {
    return delay(BOOKS.filter((b) => b.flags.includes('editor-pick')), 150);
  },

  async getRanking(type: 'hot' | 'follow' | 'ticket' | 'new'): Promise<BookSummary[]> {
    const sorted = [...BOOKS];
    if (type === 'hot') sorted.sort((a, b) => b.clickCount - a.clickCount);
    else if (type === 'follow') sorted.sort((a, b) => b.followCount - a.followCount);
    else if (type === 'ticket') sorted.sort((a, b) => b.ratingCount - a.ratingCount);
    else sorted.sort((a, b) => b.lastUpdated - a.lastUpdated);
    return delay(sorted.slice(0, 10), 200);
  },

  async getCategories(): Promise<Category[]> {
    return delay(CATEGORIES, 100);
  },

  /* ---------- 详情页 ---------- */
  async getBook(bookId: string): Promise<BookSummary | null> {
    const book = BOOKS.find((b) => b.id === bookId) ?? null;
    return delay(book, 150);
  },

  async getChapters(bookId: string): Promise<ChapterSummary[]> {
    return delay(CHAPTERS[bookId] ?? [], 200);
  },

  async getChapter(bookId: string, chapterId: string): Promise<ChapterContent | null> {
    const ch = getChapterContent(bookId, chapterId);
    return delay(ch, 250);
  },

  async getRelatedBooks(bookId: string): Promise<BookSummary[]> {
    const book = BOOKS.find((b) => b.id === bookId);
    if (!book) return delay([], 100);
    const related = BOOKS.filter((b) => b.id !== bookId && b.category === book.category).slice(0, 6);
    return delay(related, 200);
  },

  async getComments(bookId: string): Promise<Comment[]> {
    return delay(COMMENTS.filter((c) => c.bookId === bookId), 200);
  },

  async getRatingDistribution(bookId: string): Promise<RatingDistribution> {
    return delay(getRatingDistribution(bookId), 150);
  },

  /* ---------- 分类页 ---------- */
  async getTags(): Promise<Tag[]> {
    return delay(TAGS, 100);
  },

  async getCategoryBooks(params: {
    category?: string;
    tags?: string[];
    sort?: SortKey;
    status?: 'ongoing' | 'completed';
    page?: number;
    pageSize?: number;
  }): Promise<PagedResult<BookSummary>> {
    const { category, tags = [], sort = 'hot', status, page = 1, pageSize = 12 } = params;
    let list = [...BOOKS];
    if (category && category !== 'all') list = list.filter((b) => b.category === category);
    if (tags.length > 0) list = list.filter((b) => tags.every((t) => b.tags.includes(t)));
    if (status) list = list.filter((b) => b.status === status);
    if (sort === 'hot') list.sort((a, b) => b.clickCount - a.clickCount);
    else if (sort === 'follow') list.sort((a, b) => b.followCount - a.followCount);
    else if (sort === 'latest') list.sort((a, b) => b.lastUpdated - a.lastUpdated);
    else if (sort === 'completed') list = list.filter((b) => b.status === 'completed');
    const total = list.length;
    const start = (page - 1) * pageSize;
    const items = list.slice(start, start + pageSize);
    return delay({ items, total, page, pageSize, hasMore: start + pageSize < total }, 250);
  },

  /* ---------- 搜索页 ---------- */
  async searchSuggestions(keyword: string): Promise<SearchSuggestion[]> {
    if (!keyword.trim()) return delay([], 50);
    const k = keyword.trim();
    const sugs: SearchSuggestion[] = [];
    BOOKS.forEach((b) => {
      if (b.title.includes(k)) sugs.push({ type: 'book', text: b.title, bookId: b.id });
      if (b.author.includes(k) && !sugs.some((s) => s.type === 'author' && s.text === b.author)) {
        sugs.push({ type: 'author', text: b.author });
      }
    });
    TAGS.forEach((t) => {
      if (t.name.includes(k)) sugs.push({ type: 'tag', text: t.name });
    });
    return delay(sugs.slice(0, 8), 120);
  },

  async searchBooks(keyword: string, page = 1, pageSize = 10): Promise<PagedResult<BookSummary>> {
    const k = keyword.trim();
    if (!k) return delay({ items: [], total: 0, page, pageSize, hasMore: false }, 100);
    const list = BOOKS.filter(
      (b) => b.title.includes(k) || b.author.includes(k) || b.tags.some((t) => t.includes(k)),
    );
    const total = list.length;
    const start = (page - 1) * pageSize;
    return delay({ items: list.slice(start, start + pageSize), total, page, pageSize, hasMore: start + pageSize < total }, 200);
  },

  async getHotSearches(): Promise<string[]> {
    return delay(HOT_SEARCHES, 50);
  },

  /* ---------- 个人中心 ---------- */
  async getCurrentUser(): Promise<UserProfile> {
    return delay(CURRENT_USER, 100);
  },

  async getBookshelf(_tab: 'all' | 'ongoing' | 'completed' | 'recent'): Promise<BookSummary[]> {
    let list = BOOKS.slice(0, 12);
    if (_tab === 'ongoing') list = list.filter((b) => b.status === 'ongoing');
    else if (_tab === 'completed') list = list.filter((b) => b.status === 'completed');
    else if (_tab === 'recent') list = list.slice().sort((a, b) => b.lastUpdated - a.lastUpdated);
    return delay(list, 200);
  },

  async getReadingHistory(): Promise<ReadingHistoryItem[]> {
    return delay(READING_HISTORY, 200);
  },

  async getBookLists(): Promise<BookList[]> {
    return delay(BOOK_LISTS, 150);
  },

  async getRewardRecords(): Promise<RewardRecord[]> {
    return delay(REWARD_RECORDS, 150);
  },

  /* ---------- P6 · 扩展接口 ---------- */
  async getRankings(type: 'hot' | 'follow' | 'ticket' | 'new'): Promise<RankItem[]> {
    return delay(RANKINGS[type], 200);
  },

  async getRecommendations(): Promise<RecommendBook[]> {
    // 模拟"换一批"：每次打乱顺序
    const shuffled = [...RECOMMENDATIONS].sort(() => Math.random() - 0.5);
    return delay(shuffled, 200);
  },

  async getTopics(): Promise<Topic[]> {
    return delay(TOPICS, 150);
  },

  async getReviews(page = 1, pageSize = 10): Promise<PagedResult<Review>> {
    const total = REVIEWS.length;
    const start = (page - 1) * pageSize;
    const items = REVIEWS.slice(start, start + pageSize);
    return delay({ items, total, page, pageSize, hasMore: start + pageSize < total }, 200);
  },

  async getReadingStatOverview(): Promise<ReadingStatOverview> {
    return delay(READING_STAT_OVERVIEW, 200);
  },

  async getHeatmap(): Promise<HeatmapCell[]> {
    return delay(HEATMAP, 200);
  },

  async getPreferences(): Promise<PreferenceItem[]> {
    return delay(PREFERENCES, 200);
  },

  async getBadges(): Promise<Badge[]> {
    return delay(BADGES, 200);
  },

  async getVipPlans(): Promise<VipPlan[]> {
    return delay(VIP_PLANS, 150);
  },

  async getPaymentMethods(): Promise<PaymentMethodItem[]> {
    return delay(PAYMENT_METHODS, 100);
  },

  async getFollowList(): Promise<FollowItem[]> {
    return delay(FOLLOW_LIST, 200);
  },
};

export type Fetcher = typeof fetcher;
