/* ============================================================
 * P0-9 · B 端 Mock fetcher
 * 模拟网络延迟，所有页面通过此层调用，后续可平替为真实 API
 * ============================================================ */

import type { AdminUser, LoginCredentials, LoginResponse } from './types';

/** 模拟网络延迟 */
function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

/** Mock 管理员用户（P6 扩充：多角色用于权限分层验证） */
const MOCK_USERS: Record<string, { user: AdminUser; password: string }> = {
  admin: {
    password: 'admin123',
    user: {
      id: 'admin-001',
      username: 'admin',
      nickname: '超级管理员',
      avatar: 'https://picsum.photos/seed/admin001/64/64',
      email: 'admin@atlas.novel',
      roles: ['super-admin'],
      permissions: [],
      lastLoginAt: Date.now() - 3600_000,
      enabled: true,
    },
  },
  content: {
    password: 'content123',
    user: {
      id: 'admin-002',
      username: 'content',
      nickname: '内容管理员',
      avatar: 'https://picsum.photos/seed/admin002/64/64',
      email: 'content@atlas.novel',
      roles: ['content-admin'],
      permissions: [
        'novel.list', 'novel.create', 'novel.edit', 'novel.shelve',
        'chapter.list', 'chapter.create', 'chapter.edit',
        'author.list', 'author.edit',
      ],
      lastLoginAt: Date.now() - 7200_000,
      enabled: true,
    },
  },
  auditor: {
    password: 'auditor123',
    user: {
      id: 'admin-003',
      username: 'auditor',
      nickname: '审核员',
      avatar: 'https://picsum.photos/seed/admin003/64/64',
      email: 'auditor@atlas.novel',
      roles: ['auditor'],
      permissions: ['audit.list', 'audit.approve', 'audit.reject', 'novel.list', 'chapter.list'],
      lastLoginAt: Date.now() - 1800_000,
      enabled: true,
    },
  },
  operation: {
    password: 'operation123',
    user: {
      id: 'admin-004',
      username: 'operation',
      nickname: '运营管理员',
      avatar: 'https://picsum.photos/seed/admin004/64/64',
      email: 'operation@atlas.novel',
      roles: ['operation-admin'],
      permissions: [
        'novel.list', 'novel.shelve', 'chapter.list', 'audit.list', 'user.list', 'royalty.list',
      ],
      lastLoginAt: Date.now() - 5400_000,
      enabled: true,
    },
  },
};

/** Mock 登录响应 */
function mockLoginResponse(creds: LoginCredentials): LoginResponse {
  const entry = MOCK_USERS[creds.username];
  if (!entry || entry.password !== creds.password) {
    throw new Error('用户名或密码错误');
  }
  return {
    token: `mock-token-${Date.now()}`,
    user: entry.user,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    refreshToken: `mock-refresh-${Date.now()}`,
  };
}

export const fetcher = {
  /* ---------- 鉴权 ---------- */
  auth: {
    async login(creds: LoginCredentials): Promise<LoginResponse> {
      return delay(mockLoginResponse(creds), 400);
    },
    async refresh(refreshToken: string): Promise<LoginResponse> {
      // mock：refresh 时返回 admin 用户（实际场景由后端根据 refreshToken 解析）
      return delay({
        token: `mock-token-refreshed-${Date.now()}`,
        user: MOCK_USERS.admin.user,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        refreshToken,
      }, 200);
    },
    async logout(): Promise<void> {
      return delay(undefined, 100);
    },
    async getCurrentUser(): Promise<AdminUser> {
      return delay(MOCK_USERS.admin.user, 150);
    },
  },

  /* ---------- 工作台 ---------- */
  workbench: {
    async getKpiCards() {
      return delay({
        totalNovels: 1280,
        publishedNovels: 1100,
        pendingAudit: 23,
        totalAuthors: 450,
        totalReaders: 128_500,
        todayRevenue: 8650.5,
      }, 200);
    },
    async getWordCountTrend() {
      const days = 30;
      const data = Array.from({ length: days }, (_, i) => ({
        date: `2026-07-${String(i + 1).padStart(2, '0')}`,
        wordCount: Math.floor(800_000 + Math.random() * 400_000),
      }));
      return delay(data, 250);
    },
  },

  /* ---------- 内容管理 ---------- */
  novel: {
    async getList(params: { page: number; pageSize: number; keyword?: string; status?: string }) {
      // Mock 数据：P4 阶段细化
      return delay({
        items: [],
        total: 1280,
        page: params.page,
        pageSize: params.pageSize,
        hasMore: params.page * params.pageSize < 1280,
      }, 250);
    },
  },

  /* ---------- 用户管理 ---------- */
  user: {
    async getList(params: { page: number; pageSize: number }) {
      return delay({
        items: [],
        total: 128_500,
        page: params.page,
        pageSize: params.pageSize,
        hasMore: params.page * params.pageSize < 128_500,
      }, 250);
    },
  },

  /* ---------- 系统设置 ---------- */
  system: {
    async getConfig() {
      return delay({
        siteName: 'Atlas 小说',
        icp: '京ICP备xxxxxxxx号',
        sensitiveWordLibVersion: '2026.07.31',
      }, 150);
    },
  },
};
