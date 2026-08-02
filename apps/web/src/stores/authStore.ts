import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ReaderUser {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
}

interface AuthState {
  token: string | null;
  user: ReaderUser | null;
  setAuth: (token: string, user: ReaderUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'atlas-reader-auth' },
  ),
);