/* ============================================================
 * P0-13 · 鉴权状态 Store（Zustand + persist）
 * - token / user / 过期时间管理
 * - login / logout / refresh / hasPermission
 * - 401 拦截器配合处理会话过期
 * ============================================================ */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser, LoginCredentials, LoginResponse, Permission } from '@/api/types';
import { fetcher } from '@/api/fetcher';

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  expiresAt: number | null;
  refreshToken: string | null;
  /** 是否已认证（派生） */
  isAuthenticated: boolean;
  /** token 临近过期阈值（5 分钟） */
  refreshThresholdMs: number;

  login: (creds: LoginCredentials) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  hasPermission: (perm: Permission) => boolean;
  hasRole: (role: AdminUser['roles'][number]) => boolean;
}

/** 默认 token 有效期 8 小时 */
const DEFAULT_TOKEN_TTL = 8 * 60 * 60 * 1000;
/** 临近过期阈值 5 分钟 */
const REFRESH_THRESHOLD = 5 * 60 * 1000;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      expiresAt: null,
      refreshToken: null,
      isAuthenticated: false,
      refreshThresholdMs: REFRESH_THRESHOLD,

      login: async (creds) => {
        const res: LoginResponse = await fetcher.auth.login(creds);
        set({
          token: res.token,
          user: res.user,
          expiresAt: res.expiresAt || Date.now() + DEFAULT_TOKEN_TTL,
          refreshToken: res.refreshToken ?? null,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          token: null,
          user: null,
          expiresAt: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

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
          // refresh 失败，强制登出
          get().logout();
        }
      },

      hasPermission: (perm) => {
        const { user } = get();
        if (!user) return false;
        // 超级管理员拥有全部权限
        if (user.roles.includes('super-admin')) return true;
        return user.permissions.includes(perm);
      },

      hasRole: (role) => {
        const { user } = get();
        return user?.roles.includes(role) ?? false;
      },
    }),
    {
      name: 'atlas-admin-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        expiresAt: state.expiresAt,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

/** 工具：检查 token 是否临近过期（用于 RequireAuth 自动 refresh） */
export function isTokenNearExpiry(expiresAt: number | null, threshold = REFRESH_THRESHOLD): boolean {
  if (!expiresAt) return false;
  return expiresAt - Date.now() < threshold;
}

/** 工具：检查 token 是否已过期 */
export function isTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
}
