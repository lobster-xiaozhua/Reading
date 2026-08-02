/* ============================================================
 * P5 · 用户状态 Store
 * 当前登录用户 + 书架集合（按书ID记录）
 * ============================================================ */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/api/types';
import { fetcher } from '@/api/fetcher';

interface UserState {
  user: UserProfile | null;
  loading: boolean;
  /** 已加入书架的书 ID 集合 */
  bookshelfIds: string[];
  /** 收藏的书单 ID */
  followedBookListIds: string[];
  loadUser: () => Promise<void>;
  toggleBookshelf: (bookId: string) => void;
  isInBookshelf: (bookId: string) => boolean;
  toggleFollowBookList: (listId: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      bookshelfIds: [],
      followedBookListIds: [],

      loadUser: async () => {
        set({ loading: true });
        try {
          const [user, shelf] = await Promise.all([
            fetcher.getCurrentUser(),
            fetcher.getBookshelf('all'),
          ]);
          set({
            user,
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
            bookshelfIds: adding ? [...ids, bookId] : ids.filter((id) => id !== bookId),
          });
        } catch {
          // 同步失败保持原状态
        }
      },

      isInBookshelf: (bookId) => get().bookshelfIds.includes(bookId),

      toggleFollowBookList: (listId) => {
        const ids = get().followedBookListIds;
        set({
          followedBookListIds: ids.includes(listId)
            ? ids.filter((id) => id !== listId)
            : [...ids, listId],
        });
      },

      logout: () => set({ user: null }),
    }),
    {
      name: 'atlas-user-store',
      partialize: (state) => ({
        bookshelfIds: state.bookshelfIds,
        followedBookListIds: state.followedBookListIds,
      }),
    },
  ),
);
