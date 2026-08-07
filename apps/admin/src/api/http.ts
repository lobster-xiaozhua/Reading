/* ============================================================
 * B 端 HTTP 客户端
 * 基于 fetch 封装统一响应体 { code, message, data, traceId }
 * 自动注入 Bearer token（来自 authStore 持久化 localStorage）
 * 401 统一登出并跳转登录页
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const method = options.method ?? "GET";
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
      ...options,
    });
  } catch (err) {
    console.error("[http] network error", { path, method, error: err });
    throw new ApiError(-1, "网络异常，请稍后重试");
  }

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
  return body.data as T;
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
