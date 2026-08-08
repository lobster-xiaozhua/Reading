/* ============================================================
 * P0 · 统一状态管理 Store
 * 合并 authStore + userStore + historyStore
 * 单一 persist 实例，减少序列化开销
 * ============================================================ */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { fetcher } from "@/api/fetcher";
import type { UserProfile } from "@/api/types";

/* ---------- 类型 ---------- */

export interface ReaderUser {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
}

export interface HistoryEntry {
  bookId: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  percent: number;
  readAt: number;
}

export interface BookmarkEntry {
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  createdAt: number;
}

export interface AtlasState {
  /* ---- auth ---- */
  token: string | null;
  authUser: ReaderUser | null;
  expiresAt: number | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  /* ---- profile ---- */
  profile: UserProfile | null;
  loading: boolean;
  bookshelfIds: string[];
  followedBookListIds: string[];

  /* ---- history ---- */
  entries: Record<string, HistoryEntry>;

  /* ---- bookmarks ---- */
  bookmarks: BookmarkEntry[];

  /* ---- actions ---- */
  login: (username: string, password: string) => Promise<void>;
  setAuth: (token: string, user: ReaderUser, expiresAt?: number, refreshToken?: string) => void;
  loadUser: () => Promise<void>;
  toggleBookshelf: (bookId: string) => void;
  toggleFollowBookList: (listId: string) => void;
  recordReading: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  refresh: () => Promise<void>;
  logout: () => void;

  /* ---- bookmarks actions ---- */
  addBookmark: (entry: BookmarkEntry) => void;
  removeBookmark: (bookId: string, chapterId: string) => void;
  clearBookmarks: () => void;

  /* ---- helpers ---- */
  isInBookshelf: (bookId: string) => boolean;
  getEntry: (bookId: string) => HistoryEntry | undefined;
  isBookmarked: (bookId: string, chapterId: string) => boolean;
  getBookmarks: (bookId: string) => BookmarkEntry[];
}

/* ---------- 常量 ---------- */

const DEFAULT_TOKEN_TTL = 8 * 60 * 60 * 1000;
const RECORD_DEBOUNCE_MS = 3_000;
const MAX_RECORD_KEYS = 200;
const lastRecordTime: Record<string, number> = {};

/** 重置记录防抖时间戳（测试用） */
export function resetRecordDebounce(): void {
  for (const key in lastRecordTime) {
    delete lastRecordTime[key];
  }
}

/* ---------- 创建 Store ---------- */

export const useAtlasStore = create<AtlasState>()(
  persist(
    (set, get) => ({
      /* ---- auth ---- */
      token: null,
      authUser: null,
      expiresAt: null,
      refreshToken: null,
      isAuthenticated: false,

      /* ---- profile ---- */
      profile: null,
      loading: false,
      bookshelfIds: [],
      followedBookListIds: [],

      /* ---- history ---- */
      entries: {},

      /* ---- bookmarks ---- */
      bookmarks: [],

      /* ---- actions ---- */
      login: async (username, password) => {
        const res = await fetcher.auth.login(username, password);
        set({
          token: res.token,
          authUser: res.user,
          expiresAt: res.expiresAt || Date.now() + DEFAULT_TOKEN_TTL,
          refreshToken: res.refreshToken ?? null,
          isAuthenticated: true,
        });
      },

      setAuth: (token, user, expiresAt, refreshToken) => {
        set({
          token,
          authUser: user,
          expiresAt: expiresAt ?? Date.now() + DEFAULT_TOKEN_TTL,
          refreshToken: refreshToken ?? null,
          isAuthenticated: true,
        });
      },

      loadUser: async () => {
        set({ loading: true });
        try {
          const [profile, shelf] = await Promise.all([
            fetcher.getCurrentUser(),
            fetcher.getBookshelf("all"),
          ]);
          set({
            profile,
            bookshelfIds: shelf.map((b) => b.id),
            loading: false,
          });
        } catch {
          set({ loading: false });
        }
      },

      toggleBookshelf: async (bookId) => {
        const ids = get().bookshelfIds;
        const adding = !ids.includes(bookId);
        try {
          if (adding) {
            await fetcher.addToBookshelf(bookId);
          } else {
            await fetcher.removeFromBookshelf(bookId);
          }
          set({
            bookshelfIds: adding
              ? [...ids, bookId]
              : ids.filter((id) => id !== bookId),
          });
        } catch {
          // 同步失败保持原状态
        }
      },

      toggleFollowBookList: (listId) => {
        const ids = get().followedBookListIds;
        set({
          followedBookListIds: ids.includes(listId)
            ? ids.filter((id) => id !== listId)
            : [...ids, listId],
        });
      },

      recordReading: (entry) => {
        const lastTime = lastRecordTime[entry.bookId];
        if (lastTime !== undefined && entry.readAt - lastTime < RECORD_DEBOUNCE_MS) return;
        lastRecordTime[entry.bookId] = entry.readAt;
        // LRU 上限：超限时按插入顺序清掉最旧一半，防止字典无限增长
        const keys = Object.keys(lastRecordTime);
        if (keys.length > MAX_RECORD_KEYS) {
          const removeCount = keys.length - MAX_RECORD_KEYS;
          for (let i = 0; i < removeCount; i++) {
            const k = keys[i];
            if (k) delete lastRecordTime[k];
          }
        }
        set((state) => ({
          entries: { ...state.entries, [entry.bookId]: entry },
        }));
      },

      clearHistory: () => set({ entries: {} }),

      /* ---- bookmarks ---- */
      addBookmark: (entry) =>
        set((state) => ({
          bookmarks: [...state.bookmarks, entry],
        })),
      removeBookmark: (bookId, chapterId) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter(
            (b) => !(b.bookId === bookId && b.chapterId === chapterId),
          ),
        })),
      clearBookmarks: () => set({ bookmarks: [] }),

      refresh: async () => {
        const { refreshToken, token } = get();
        if (!refreshToken && !token) return;
        try {
          const res = await fetcher.auth.refresh(refreshToken ?? token!);
          set({
            token: res.token,
            expiresAt: res.expiresAt || Date.now() + DEFAULT_TOKEN_TTL,
            refreshToken: res.refreshToken ?? refreshToken,
            isAuthenticated: true,
          });
        } catch {
          get().logout();
        }
      },

      logout: () => {
        // 通知后端失效 refresh token（fire-and-forget，失败不影响本地登出）
        const { refreshToken, token } = get();
        if (refreshToken || token) {
          void fetcher.auth.logout(refreshToken ?? undefined).catch(() => {});
        }
        set({
          token: null,
          authUser: null,
          expiresAt: null,
          refreshToken: null,
          isAuthenticated: false,
          profile: null,
          loading: false,
          bookshelfIds: [],
          followedBookListIds: [],
          entries: {},
        });
      },

      /* ---- helpers ---- */
      isInBookshelf: (bookId) => get().bookshelfIds.includes(bookId),
      getEntry: (bookId) => get().entries[bookId],
      isBookmarked: (bookId, chapterId) =>
        get().bookmarks.some(
          (b) => b.bookId === bookId && b.chapterId === chapterId,
        ),
      getBookmarks: (bookId) =>
        get().bookmarks.filter((b) => b.bookId === bookId),
    }),
    {
      name: "atlas-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        authUser: state.authUser,
        expiresAt: state.expiresAt,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        bookshelfIds: state.bookshelfIds,
        followedBookListIds: state.followedBookListIds,
        entries: state.entries,
        bookmarks: state.bookmarks,
      }),
    },
  ),
);

/* ---------- 工具函数 ---------- */

export function isTokenNearExpiry(expiresAt: number | null): boolean {
  if (!expiresAt) return false;
  return expiresAt - Date.now() < 5 * 60 * 1000;
}

export function isTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
}