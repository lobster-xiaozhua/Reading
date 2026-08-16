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

interface HttpPathMetric {
  path: string;
  count: number;
  errorCount: number;
}

interface RedisPatternMetric {
  pattern: string;
  hits: number;
  misses: number;
}

interface SlowItem {
  text: string;
  durationMs: number;
}

interface RedisCommandMetric {
  command: string;
  calls: number;
}

export interface SystemMetricsSnapshot {
  httpTotal: number;
  httpErrorTotal: number;
  httpAvgDurationMs: number;
  httpTopPaths: HttpPathMetric[];
  redisHits: number;
  redisMisses: number;
  redisHitRate: number;
  redisPatterns: RedisPatternMetric[];
  redisCommandCalls: RedisCommandMetric[];
  redisSlowCommands: SlowItem[];
  slowQueryCount: number;
  slowQueryAvgMs: number;
  slowQueryTop: SlowItem[];
}

export type OperationTag = "health" | "api" | "pages" | "flow" | "performance" | "all";

export interface OperationCheckResult {
  name: string;
  status: "pass" | "fail" | "warn" | "skip";
  tags: string[];
  durationMs: number;
  detail: string;
}

export interface OperationsSnapshot {
  serviceStatus: "ready" | "degraded" | "unavailable";
  ready: boolean;
  failedDependencies: number;
  hasReport: boolean;
  jobId: string;
  jobStatus: string;
  tag: string;
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warned: number;
    skipped: number;
    passRate: number;
    elapsedMs: number;
  };
  results: OperationCheckResult[];
}

export interface OperationsJob {
  jobId: string;
  tag: OperationTag;
  status: "pending" | "running" | "done" | "failed";
  startedAt: number;
  finishedAt: number;
  error: string;
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
    async getSystemMetrics(): Promise<SystemMetricsSnapshot> {
      return cachedGet<SystemMetricsSnapshot>("/workbench/system-metrics");
    },
    async getOperations(): Promise<OperationsSnapshot> {
      return http.get<OperationsSnapshot>("/workbench/operations", { _ts: Date.now() });
    },
    async runOperationsCheck(tag: OperationTag, timeoutMs = 15_000): Promise<OperationsJob> {
      return http.post<OperationsJob>("/workbench/operations/run", { tag, timeoutMs });
    },
    async getOperationsJob(jobId: string): Promise<OperationsJob> {
      return http.get<OperationsJob>(`/workbench/operations/jobs/${jobId}`, { _ts: Date.now() });
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
