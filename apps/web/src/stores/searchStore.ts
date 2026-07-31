/* ============================================================
 * P5 · 搜索历史 Store
 * localStorage 持久化，最近 10 条
 * ============================================================ */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchState {
  history: string[];
  addHistory: (keyword: string) => void;
  removeHistory: (keyword: string) => void;
  clearHistory: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      history: [],
      addHistory: (keyword) => {
        const k = keyword.trim();
        if (!k) return;
        const prev = get().history.filter((h) => h !== k);
        set({ history: [k, ...prev].slice(0, 10) });
      },
      removeHistory: (keyword) =>
        set((state) => ({ history: state.history.filter((h) => h !== keyword) })),
      clearHistory: () => set({ history: [] }),
    }),
    { name: 'atlas-search-store' },
  ),
);
