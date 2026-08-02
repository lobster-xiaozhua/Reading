const AUTH_KEY = 'atlas-reader-auth';

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
    this.name = 'ApiError';
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

const BASE_URL = '/api/v1/c';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
      ...options,
    });
  } catch (err) {
    throw new ApiError(-1, '网络异常，请稍后重试');
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(res.status, `服务响应异常（HTTP ${res.status}）`);
  }

  if (body.code !== 0) {
    throw new ApiError(body.code, body.message || '请求失败', body.traceId);
  }
  return body.data as T;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const http = {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>(`${path}${buildQuery(params ?? {})}`, { method: 'GET' });
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  del<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
