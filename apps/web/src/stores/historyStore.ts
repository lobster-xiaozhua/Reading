/* ============================================================
 * P5 · 阅读历史 Store
 * 记录每本书的最后阅读章节 + 进度，跨端同步用
 * ============================================================ */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HistoryEntry {
  bookId: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  percent: number;
  readAt: number;
}

interface HistoryState {
  /** 按 bookId 索引的最新阅读记录 */
  entries: Record<string, HistoryEntry>;
  recordReading: (entry: HistoryEntry) => void;
  getEntry: (bookId: string) => HistoryEntry | undefined;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: {},
      recordReading: (entry) =>
        set((state) => ({
          entries: { ...state.entries, [entry.bookId]: entry },
        })),
      getEntry: (bookId) => get().entries[bookId],
      clearAll: () => set({ entries: {} }),
    }),
    { name: 'atlas-history-store' },
  ),
);
