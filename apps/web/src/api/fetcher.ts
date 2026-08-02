/* ============================================================
 * C 端 fetcher：对接后端 /api/v1/c 真实接口
 * 统一响应体 { code, message, data, traceId }，由 http 客户端解包
 * ============================================================ */
import { http, ApiError } from './http';
import type {
  Badge,
  Banner,
  BookList,
  BookSummary,
  Category,
  ChapterContent,
  ChapterSummary,
  Comment,
  FollowItem,
  HeatmapCell,
  PagedResult,
  PaymentMethodItem,
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

/** 后端 /books/{id}/chapters 返回的章节项（bookId 驼峰） */
interface ChapterListItem {
  id: string;
  bookId: string;
  index: number;
  title: string;
  wordCount: number;
  isVip: boolean;
  publishedAt: number;
}

/** 后端书架项：book + 进度 */
interface BookshelfItem {
  book: BookSummary;
  addedAt: number;
  lastReadChapterIndex: number;
  percent: number;
}

/** 后端评论（user.nickname 可能为空串） */
interface BackendComment extends Comment {}

function toChapterSummary(c: ChapterListItem): ChapterSummary {
  return { ...c };
}

function toPaged<T>(items: T[], total: number, page: number, pageSize: number): PagedResult<T> {
  return { items, total, page, pageSize, hasMore: page * pageSize < total };
}

export const fetcher = {
  /* ---------- 读者鉴权 ---------- */
  auth: {
    async login(username: string, password: string) {
      return http.post<{ token: string; user: { id: string; username: string; nickname: string } }>('/auth/login', { username, password });
    },
    async register(username: string, password: string, nickname?: string) {
      return http.post<{ token: string; user: { id: string; username: string; nickname: string } }>('/auth/register', { username, password, nickname: nickname ?? '' });
    },
    async getMe() {
      return http.get<{ id: string; username: string; nickname: string; avatar: string }>('/auth/me');
    },
  },
  /* ---------- 发现页 ---------- */
  async getBanners(): Promise<Banner[]> {
    return http.get<Banner[]>('/banners');
  },

  async getHotBooks(): Promise<BookSummary[]> {
    return http.get<BookSummary[]>('/books/hot', { limit: 10 });
  },

  async getFreeLimitedBooks(): Promise<BookSummary[]> {
    return http.get<BookSummary[]>('/books/free-limited', { limit: 10 });
  },

  async getEditorPicks(): Promise<BookSummary[]> {
    const items = await http.get<RecommendBook[]>('/books/editor-picks', { limit: 10 });
    return items.map((r) => r.book);
  },

  async getRanking(type: 'hot' | 'follow' | 'ticket' | 'new'): Promise<BookSummary[]> {
    const items = await http.get<RankItem[]>(`/rankings/${type}`, { limit: 10 });
    return items.map((r) => r.book);
  },

  async getCategories(): Promise<Category[]> {
    return http.get<Category[]>('/categories');
  },

  /* ---------- 详情页 ---------- */
  async getBook(bookId: string): Promise<BookSummary | null> {
    try {
      return await http.get<BookSummary>(`/books/${bookId}`);
    } catch (err) {
      if (err instanceof ApiError) return null;
      throw err;
    }
  },

  async getChapters(bookId: string): Promise<ChapterSummary[]> {
    const items = await http.get<ChapterListItem[]>(`/books/${bookId}/chapters`);
    return items.map(toChapterSummary);
  },

  async getChapter(bookId: string, chapterId: string): Promise<ChapterContent | null> {
    try {
      return await http.get<ChapterContent>(`/books/${bookId}/chapters/${chapterId}`);
    } catch (err) {
      if (err instanceof ApiError) return null;
      throw err;
    }
  },

  async getRelatedBooks(bookId: string): Promise<BookSummary[]> {
    return http.get<BookSummary[]>(`/books/${bookId}/related`, { limit: 6 });
  },

  async getComments(bookId: string): Promise<Comment[]> {
    return http.get<BackendComment[]>(`/books/${bookId}/comments`, { limit: 50 });
  },

  async getRatingDistribution(bookId: string): Promise<RatingDistribution> {
    return http.get<RatingDistribution>(`/books/${bookId}/rating-distribution`);
  },

  /* ---------- 分类页 ---------- */
  async getTags(): Promise<Tag[]> {
    return http.get<Tag[]>('/tags');
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

    // 后端不支持 tag 过滤：带 tag 时扩大拉取并前端二次过滤
    if (tags.length > 0) {
      const data = await http.get<BookSummary[]>('/books', {
        category,
        sort,
        status,
        page: 1,
        page_size: 100,
      });
      const filtered = data.filter((b) => tags.every((t) => b.tags.includes(t)));
      const total = filtered.length;
      const start = (page - 1) * pageSize;
      return toPaged(filtered.slice(start, start + pageSize), total, page, pageSize);
    }

    const data = await http.get<PagedResult<BookSummary>>('/books', {
      category,
      sort,
      status,
      page,
      page_size: pageSize,
    });
    return data;
  },

  /* ---------- 搜索页 ---------- */
  async searchSuggestions(keyword: string): Promise<SearchSuggestion[]> {
    if (!keyword.trim()) return [];
    return http.get<SearchSuggestion[]>('/search/suggestions', { keyword: keyword.trim() });
  },

  async searchBooks(keyword: string, page = 1, pageSize = 10): Promise<PagedResult<BookSummary>> {
    if (!keyword.trim()) return toPaged([], 0, page, pageSize);
    return http.get<PagedResult<BookSummary>>('/search/books', {
      keyword: keyword.trim(),
      page,
      page_size: pageSize,
    });
  },

  async getHotSearches(): Promise<string[]> {
    return http.get<string[]>('/search/hot', { limit: 10 });
  },

  /* ---------- 个人中心 ---------- */
  async getCurrentUser(): Promise<UserProfile> {
    return http.get<UserProfile>('/me');
  },

  async getBookshelf(_tab: 'all' | 'ongoing' | 'completed' | 'recent'): Promise<BookSummary[]> {
    const items = await http.get<BookshelfItem[]>('/me/bookshelf', { tab: _tab });
    return items.map((i) => i.book);
  },

  async getReadingHistory(): Promise<ReadingHistoryItem[]> {
    return http.get<ReadingHistoryItem[]>('/me/reading-history', { limit: 50 });
  },

  async getBookLists(): Promise<BookList[]> {
    return http.get<BookList[]>('/book-lists', { limit: 10 });
  },

  async getRewardRecords(): Promise<RewardRecord[]> {
    return http.get<RewardRecord[]>('/me/rewards', { limit: 50 });
  },

  /* ---------- P6 · 扩展接口 ---------- */
  async getRankings(type: 'hot' | 'follow' | 'ticket' | 'new'): Promise<RankItem[]> {
    return http.get<RankItem[]>(`/rankings/${type}`, { limit: 50 });
  },

  async getRecommendations(): Promise<RecommendBook[]> {
    return http.get<RecommendBook[]>('/recommendations', { limit: 10 });
  },

  async getTopics(): Promise<Topic[]> {
    return http.get<Topic[]>('/topics', { limit: 20 });
  },

  async getReviews(page = 1, pageSize = 10): Promise<PagedResult<Review>> {
    const all = await http.get<Review[]>('/reviews', { limit: 100 });
    const total = all.length;
    const start = (page - 1) * pageSize;
    return toPaged(all.slice(start, start + pageSize), total, page, pageSize);
  },

  async getReadingStatOverview(): Promise<ReadingStatOverview> {
    return http.get<ReadingStatOverview>('/me/stats/overview');
  },

  async getHeatmap(): Promise<HeatmapCell[]> {
    return http.get<HeatmapCell[]>('/me/stats/heatmap', { days: 365 });
  },

  async getPreferences(): Promise<PreferenceItem[]> {
    return http.get<PreferenceItem[]>('/me/stats/preferences');
  },

  async getBadges(): Promise<Badge[]> {
    return http.get<Badge[]>('/me/badges');
  },

  async getVipPlans(): Promise<VipPlan[]> {
    return http.get<VipPlan[]>('/vip/plans');
  },

  async getPaymentMethods(): Promise<PaymentMethodItem[]> {
    return http.get<PaymentMethodItem[]>('/payment/methods');
  },

  async getFollowList(): Promise<FollowItem[]> {
    return http.get<FollowItem[]>('/me/follows');
  },

  /* ---------- 写操作（互动） ---------- */
  async addToBookshelf(bookId: string): Promise<void> {
    await http.post(`/me/bookshelf/${bookId}`);
  },

  async removeFromBookshelf(bookId: string): Promise<void> {
    await http.del(`/me/bookshelf/${bookId}`);
  },

  async reportReadingProgress(payload: {
    novelId?: string;
    chapterId?: string | null;
    chapterIndex?: number | null;
    percent?: number;
  }): Promise<void> {
    const { novelId, chapterId, chapterIndex, percent } = payload;
    const query = novelId ? `?novel_id=${novelId}` : '';
    await http.post(`/me/reading-progress${query}`, {
      chapter_id: chapterId,
      chapter_index: chapterIndex,
      percent,
    });
  },

  async createComment(bookId: string, content: string, rating?: number): Promise<void> {
    await http.post(`/books/${bookId}/comments`, { content, rating: rating ?? 0 });
  },

  async likeComment(commentId: string): Promise<void> {
    await http.post(`/comments/${commentId}/like`);
  },

  async createReward(
    bookId: string,
    type: 'ticket' | 'recommend' | 'tip',
    amount: number,
  ): Promise<void> {
    await http.post(`/books/${bookId}/rewards`, { type, amount });
  },

  async submitRating(bookId: string, rating: number): Promise<void> {
    await http.post(`/books/${bookId}/rating`, { rating });
  },
};

export type Fetcher = typeof fetcher;
