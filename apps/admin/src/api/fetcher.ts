/* ============================================================
 * B 端 fetcher：对接后端 /api/v1/b 真实接口
 * 统一响应体 { code, message, data, traceId }，由 http 客户端解包
 * 使用 React Query 的 queryClient.fetchQuery 实现请求缓存与去重
 * ============================================================ */

import { queryClient } from "./queryClient";
import { http } from "./http";
import type { AdminUser, LoginCredentials, LoginResponse } from "./types";

interface WorkbenchKpi {
  totalNovels: number;
  publishedNovels: number;
  pendingAudit: number;
  totalAuthors: number;
  totalReaders: number;
  todayRevenue: number;
}

interface TrendPoint {
  date: string;
  value: number;
}

interface SystemConfig {
  siteName: string;
  icp: string;
  sensitiveWordLibVersion: string;
  version: string;
}

/** 统一请求封装：GET 请求通过 React Query 缓存去重 */
async function cachedGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const cacheKey = [url, params ?? {}];
  return queryClient.fetchQuery<T>({
    queryKey: cacheKey,
    queryFn: () => http.get<T>(url, params),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export const fetcher = {
  /* ---------- 鉴权 ---------- */
  auth: {
    async login(creds: LoginCredentials): Promise<LoginResponse> {
      return http.post<LoginResponse>("/auth/login", creds);
    },
    async refresh(refreshToken: string): Promise<LoginResponse> {
      return http.post<LoginResponse>("/auth/refresh", { refreshToken });
    },
    async logout(): Promise<void> {
      await http.post("/auth/logout");
    },
    async getCurrentUser(): Promise<AdminUser> {
      return http.get<AdminUser>("/auth/me");
    },
  },

  /* ---------- 工作台 ---------- */
  workbench: {
    async getKpiCards(): Promise<WorkbenchKpi> {
      return cachedGet<WorkbenchKpi>("/workbench/kpi");
    },
    async getOverviews(): Promise<
      { key: string; label: string; value: number; icon: string }[]
    > {
      return cachedGet("/workbench/overviews");
    },
    async getWordCountTrend(days = 30) {
      const data = await cachedGet<{
        daily: TrendPoint[];
        cumulative: TrendPoint[];
      }>("/workbench/word-trend", { days });
      return data.daily;
    },
  },

  /* ---------- 内容管理 ---------- */
  novel: {
    async getList(params: {
      page: number;
      pageSize: number;
      keyword?: string;
      status?: string;
    }) {
      return cachedGet<{
        items: unknown[];
        total: number;
        page: number;
        pageSize: number;
      }>("/novels", {
        page: params.page,
        page_size: params.pageSize,
        search_key: params.keyword ?? "",
        status: params.status ?? "all",
      });
    },
  },

  /* ---------- 用户管理 ---------- */
  user: {
    async getList(params: { page: number; pageSize: number }) {
      return cachedGet<{
        items: unknown[];
        total: number;
        page: number;
        pageSize: number;
      }>("/users", {
        page: params.page,
        page_size: params.pageSize,
      });
    },
  },

  /* ---------- 系统设置 ---------- */
  system: {
    async getConfig(): Promise<SystemConfig> {
      return cachedGet<SystemConfig>("/system/config");
    },
  },
};

export type Fetcher = typeof fetcher;
