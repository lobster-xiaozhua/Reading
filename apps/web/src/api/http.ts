import { reportError } from "@/utils/report";
import { useAuthStore, isTokenExpired } from "@/stores/authStore";
import { getBizMessage } from "@/api/errorMap";

const AUTH_KEY = "atlas-reader-auth";

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
  traceId?: string | null;
}

export class ApiError extends Error {
  code: number;
  traceId?: string | null;

  constructor(code: number, message: string, traceId?: string | null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.traceId = traceId;
  }
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw).state?.token ?? null;
  } catch {
    return null;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1/c";

/** 简易内存请求缓存：相同 URL 在 60 秒内命中缓存 */
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60_000;

/** 清空缓存（测试用） */
export function clearCache(): void {
  cache.clear();
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cacheKey = `${options.method ?? "GET"}:${path}`;
  if (options.method === "GET" || options.method === undefined) {
    const cached = getCached<T>(cacheKey);
    if (cached !== null) return cached;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const method = options.method ?? "GET";

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...headers,
        ...((options.headers as Record<string, string>) ?? {}),
      },
      ...options,
    });
  } catch (err) {
    reportError(err, { path, method, kind: "network" });
    throw new ApiError(-1, "网络异常，请稍后重试");
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    reportError(new Error("服务响应解析失败"), {
      path,
      method,
      status: res.status,
      kind: "parse",
    });
    throw new ApiError(res.status, `服务响应异常（HTTP ${res.status}）`);
  }

  if (res.status >= 500) {
    reportError(new Error(body?.message ?? "服务端错误"), {
      path,
      method,
      status: res.status,
      traceId: body?.traceId,
      kind: "server",
    });
  }

  if (body.code !== 0) {
    const message = getBizMessage(body.code, body.message || "请求失败");
    reportError(new Error(message), {
      path,
      method,
      code: body.code,
      traceId: body.traceId,
      kind: "biz",
    });
    throw new ApiError(body.code, message, body.traceId);
  }

  const data = body.data as T;
  if (options.method === "GET" || options.method === undefined) {
    setCache(cacheKey, data);
  }
  return data;
}

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshTokenOnce(): Promise<void> {
  const store = useAuthStore.getState();
  if (store.refreshToken) {
    refreshPromise = store.refresh().then(() => {
      isRefreshing = false;
      refreshPromise = null;
    }).catch(() => {
      isRefreshing = false;
      refreshPromise = null;
      store.logout();
    });
    await refreshPromise;
  } else {
    store.logout();
    isRefreshing = false;
    refreshPromise = null;
  }
}

async function requestWithRefresh<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.code === 401 && !isRefreshing) {
      const store = useAuthStore.getState();
      if (store.refreshToken && !isTokenExpired(store.expiresAt)) {
        isRefreshing = true;
        await refreshTokenOnce();
        return request<T>(path, options);
      }
      store.logout();
    }
    throw err;
  }
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const http = {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return requestWithRefresh<T>(`${path}${buildQuery(params ?? {})}`, { method: "GET" });
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return requestWithRefresh<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return requestWithRefresh<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return requestWithRefresh<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  del<T>(path: string): Promise<T> {
    return requestWithRefresh<T>(path, { method: "DELETE" });
  },
};
