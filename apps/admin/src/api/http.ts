/* ============================================================
 * B 端 HTTP 客户端
 * 基于 fetch 封装统一响应体 { code, message, data, traceId }
 * 自动注入 Bearer token（来自 authStore 持久化 localStorage）
 * 401 统一登出并跳转登录页
 * 支持请求去重、超时控制（10s）、指数退避重试（最多 2 次）
 * ============================================================ */

import { getBizMessage } from "@/api/errorMap";

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
  traceId?: string | null;
}

export class ApiError extends Error {
  code: number;
  status: number;
  traceId?: string | null;

  constructor(
    code: number,
    message: string,
    status = 0,
    traceId?: string | null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.traceId = traceId;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1/b";
const AUTH_STORAGE_KEY = "atlas-admin-auth";

/** 简易内存请求缓存：GET 请求 30 秒内命中缓存 */
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 30_000;

/** 请求去重：相同请求在飞行中只发一次 */
const pending = new Map<string, Promise<unknown>>();

export function clearHttpCache(): void {
  cache.clear();
  pending.clear();
}

/** 清空请求去重队列（测试用） */
export function clearPendingRequests(): void {
  pending.clear();
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

/** 带超时的 fetch：默认 10s */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/** 指数退避重试，最多 retryMax 次，仅对超时重试 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retryMax: number,
  timeoutMs: number,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retryMax; attempt++) {
    try {
      return await fetchWithTimeout(url, init, timeoutMs);
    } catch (err) {
      lastErr = err;
      if (!(err instanceof DOMException && err.name === "AbortError")) throw err;
      if (attempt >= retryMax) throw err;
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

/** 从 localStorage 读取当前 token（authStore persist 落盘） */
export function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

/** 401 统一登出 */
function handleUnauthorized(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.href = "/login";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryMax = 2,
): Promise<T> {
  const startMark = `${path}:start`;
  const endMark = `${path}:end`;
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(startMark);
  }
  const method = options.method ?? "GET";
  const cacheKey = `${method}:${path}`;
  if (method === "GET") {
    const cached = getCached<T>(cacheKey);
    if (cached !== null) return cached;
  }

  // 请求去重
  if (pending.has(cacheKey)) {
    return pending.get(cacheKey) as Promise<T>;
  }

  const token = getAccessToken();
  const url = `${BASE_URL}${path}`;
  const init: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  };

  const promise = fetchWithRetry(url, init, retryMax, 10_000)
    .then(async (res) => {
      let body: ApiResponse<T> | null = null;
      try {
        body = (await res.json()) as ApiResponse<T>;
      } catch {
        console.error("[http] parse error", { path, method, status: res.status });
        throw new ApiError(
          res.status,
          `服务响应异常（HTTP ${res.status}）`,
          res.status,
        );
      }

      if (res.status >= 500) {
        console.error("[http] server error", {
          path,
          method,
          status: res.status,
          traceId: body.traceId,
        });
      }

      if (body.code !== 0) {
        if (body.code === 401) {
          handleUnauthorized();
        }
        const message = getBizMessage(body.code, body.message || "请求失败");
        console.error("[http] biz error", {
          path,
          method,
          code: body.code,
          message,
          traceId: body.traceId,
        });
        throw new ApiError(body.code, message, res.status, body.traceId);
      }
      if (method === "GET") {
        setCache(cacheKey, body.data as T);
      }
      return body.data as T;
    })
    .catch((err) => {
      if (err instanceof ApiError) throw err;
      console.error("[http] network error", { path, method, error: err });
      throw new ApiError(-1, "网络异常，请稍后重试");
    })
    .finally(() => {
      pending.delete(cacheKey);
      if (typeof performance !== "undefined" && performance.mark) {
        performance.mark(endMark);
      }
    });

  pending.set(cacheKey, promise);
  return promise;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function requestSafe<T>(
  promise: Promise<T>,
): Promise<{ success: true; data: T } | { success: false; error?: string }> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "操作失败" };
  }
}

export const http = {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>(`${path}${buildQuery(params ?? {})}`, { method: "GET" });
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  /** multipart/form-data POST（不设 JSON Content-Type） */
  postFormData<T>(path: string, formData: FormData): Promise<T> {
    const token = getAccessToken();
    const url = `${BASE_URL}${path}`;
    return fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      },
      0,
      30_000,
    ).then(async (res) => {
      let body: ApiResponse<T> | null = null;
      try {
        body = (await res.json()) as ApiResponse<T>;
      } catch {
        throw new ApiError(res.status, `服务响应异常（HTTP ${res.status}）`, res.status);
      }
      if (body.code !== 0) {
        if (body.code === 401) handleUnauthorized();
        throw new ApiError(body.code, body.message || "导入失败", res.status, body.traceId);
      }
      return body.data as T;
    });
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  del<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>(`${path}${buildQuery(params ?? {})}`, {
      method: "DELETE",
    });
  },
};
