// 云笈阁 共享类型定义

export interface Book {
  id: string;
  title: string;
  author?: string;
  cover?: string | null;
  tags?: string[];
  word_count?: number;
  chapter_count?: number;
  description?: string;
  updated_at?: string;
  chapters?: Chapter[];
  _formatted?: Record<string, string>;
  _chapter_count?: number;
  _chapter_snippets?: { snippet: string }[];
}

export interface Chapter {
  id: string;
  title: string;
  paragraphs: string[];
  prev?: string;
  next?: string;
  book_title?: string;
  book_id?: string;
}

export interface BookDetail {
  id: string;
  title: string;
  author?: string;
  cover?: string | null;
  tags?: string[];
  word_count?: number;
  chapter_count?: number;
  description?: string;
  updated_at?: string;
  chapters?: Chapter[];
}

export interface SearchResult {
  books: Book[];
  chapters: ChapterResult[];
  total: number;
  page: number;
  per_page: number;
}

export interface ChapterResult {
  id: string;
  title: string;
  book_title?: string;
  _formatted?: {
    title?: string;
    content?: string;
  };
}

export interface User {
  username: string;
  id?: string;
  role?: string;
}

export interface ReadingProgress {
  bookId: string;
  chapterId: string;
  title?: string;
  bookTitle?: string;
  scrollTop?: number;
  progress?: number;
  at?: string;
}

export interface BookShelfItem {
  bookId: string;
  title: string;
  author?: string;
  cover?: string | null;
  tags?: string[];
  at?: string;
}

export interface Bookmark {
  id: string;
  chapterId: string;
  title?: string;
  scrollTop?: number;
  note?: string;
  at: string;
}

export interface ReadingStats {
  today_minutes: number;
  week_minutes: number;
  total_minutes: number;
  total_chapters: number;
  total_days: number;
  streak: number;
  week_data: number[];
}

export interface CloudProgress {
  book_id: string;
  chapter_id: string;
  scroll_top: number;
  progress: number;
  minutes: number;
  updated_at: string;
}

export interface HealthStatus {
  ok: boolean;
  status: string;
  postgres: boolean;
  meilisearch: boolean;
}

export interface DiscoverParams {
  q?: string;
  tags?: string[];
  word_min?: number | null;
  word_max?: number | null;
  updated_after?: string | null;
  updated_before?: string | null;
  sort?: string;
}

export interface AdminCreateBookPayload {
  id: string;
  title: string;
  author?: string;
  description?: string;
}

export interface AdminUpdateBookPayload {
  title?: string;
  author?: string;
  description?: string;
  tags?: string[];
}

export interface AdminCreateChapterPayload {
  title: string;
  content: string;
}

export interface BatchProgress {
  total: number;
  done: number;
  success: number;
  failed: number;
  current: string;
}

export interface SortOption {
  value: string;
  label: string;
}

export interface TimeRangeOption {
  label: string;
  value: string;
}