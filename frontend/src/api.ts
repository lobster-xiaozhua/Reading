// 后端 API 封装（通过 Vite dev proxy 走 /api）
import type {
  Book,
  BookDetail,
  Chapter,
  SearchResult,
  DiscoverParams,
  HealthStatus,
  User,
  CloudProgress,
  AdminCreateBookPayload,
  AdminUpdateBookPayload,
  AdminCreateChapterPayload,
  SortOption,
  TimeRangeOption,
  BatchProgress,
} from "./types.ts";

const ADMIN_KEY_STORAGE = "novel-admin-key";

// ===================== IndexedDB 持久缓存层 =====================
// 用于章节内容等大数据的离线持久化，替代纯内存缓存
const DB_NAME = "novel-cache";
const DB_VERSION = 1;
const CHAPTERS_STORE = "chapters";
const METADATA_STORE = "metadata";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CHAPTERS_STORE)) {
        db.createObjectStore(CHAPTERS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

async function dbGet<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result;
        resolve(result ? (result as any).data ?? null : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function dbSet(storeName: string, key: string, data: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.put({ id: key, data, ts: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB 不可用（隐私模式等），静默失败
  }
}

async function dbDelete(storeName: string, key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 静默失败
  }
}

async function dbClear(storeName: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 静默失败
  }
}

// 章节缓存：7 天过期
const CHAPTER_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export async function getCachedChapter(bookId: string, chapterId: string): Promise<any | null> {
  const key = `${bookId}:${chapterId}`;
  const entry = await dbGet<{ data: any; ts: number }>(CHAPTERS_STORE, key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CHAPTER_CACHE_TTL) {
    await dbDelete(CHAPTERS_STORE, key);
    return null;
  }
  return entry.data;
}

export async function setCachedChapter(bookId: string, chapterId: string, data: any): Promise<void> {
  const key = `${bookId}:${chapterId}`;
  await dbSet(CHAPTERS_STORE, key, data);
}

export async function clearChapterCache(): Promise<void> {
  await dbClear(CHAPTERS_STORE);
}

// ===================== 内存缓存层 =====================
// 用于列表、搜索等轻量数据，使用 LRU 语义
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL: Record<string, number> = {
  "/api/books": 30_000,       // 书籍列表 30 秒
  "/api/discover": 30_000,    // 发现页 30 秒
  "/api/health": 60_000,      // 健康检查 60 秒
};
const CACHE_DEFAULT_TTL = 0;  // 默认不缓存
const MAX_CACHE_ENTRIES = 50; // 内存缓存上限，防止泄漏

function getCacheKey(url: string): string {
  return url.split("?")[0];
}

function getFromCache<T>(url: string): T | null {
  const key = getCacheKey(url);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(url: string, data: unknown): void {
  const key = getCacheKey(url);
  const ttl = CACHE_TTL[key] ?? CACHE_DEFAULT_TTL;
  if (ttl <= 0) return;
  // LRU 淘汰：缓存条目超限时删除最旧的
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, expiry: Date.now() + ttl });
}

export function clearCache(): void {
  cache.clear();
}

export function clearCacheForBook(bookId: string): void {
  const encoded = encodeURIComponent(bookId);
  for (const key of cache.keys()) {
    if (key.includes(encoded)) {
      cache.delete(key);
    }
  }
}

export function getAdminKey(): string {
  try {
    return localStorage.getItem(ADMIN_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function setAdminKey(key: string): void {
  try {
    const v = (key || "").trim();
    if (v) localStorage.setItem(ADMIN_KEY_STORAGE, v);
    else localStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = getAdminKey();
  const token = getToken();
  const h: Record<string, string> = { ...extra };
  if (key) h["X-Admin-Key"] = key;
  if (token) h["Authorization"] = token;
  return h;
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  // 缓存优先
  const cached = getFromCache<T>(url);
  if (cached) return cached;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`请求失败 ${res.status}: ${msg}`);
  }
  const data = await res.json();
  setCache(url, data);
  return data;
}

export function fetchBooks(signal?: AbortSignal): Promise<Book[]> {
  return request<Book[]>("/api/books", signal);
}

export function fetchBookDetail(bookId: string, signal?: AbortSignal): Promise<BookDetail> {
  return request<BookDetail>(`/api/books/${encodeURIComponent(bookId)}`, signal);
}

export function fetchChapter(bookId: string, chapterId: string, signal?: AbortSignal): Promise<Chapter> {
  const url = `/api/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(chapterId)}`;
  // 章节内容：缓存优先，IndexedDB 持久化
  return fetchChapterWithCache(url, bookId, chapterId, signal);
}

async function fetchChapterWithCache(url: string, bookId: string, chapterId: string, signal?: AbortSignal): Promise<Chapter> {
  // 先查 IndexedDB 缓存
  const cached = await getCachedChapter(bookId, chapterId);
  if (cached) return cached as Chapter;

  // 未命中则发起网络请求
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`请求失败 ${res.status}: ${msg}`);
  }
  const data = await res.json() as Chapter;
  // 写入 IndexedDB 缓存（静默，不阻塞返回）
  setCachedChapter(bookId, chapterId, data);
  return data;
}

// 全文检索（Meilisearch）：返回 {books, chapters, total, page, per_page}，含高亮
export function fetchSearch(q: string, page: number = 1, signal?: AbortSignal): Promise<SearchResult> {
  return request<SearchResult>(`/api/search?q=${encodeURIComponent(q)}&page=${page}`, signal);
}

// 发现页：精准筛选（书名/作者、标签、字数、时间、排序）
export function fetchDiscover(params: DiscoverParams = {}, signal?: AbortSignal): Promise<Book[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.tags && params.tags.length)
    params.tags.forEach((t) => qs.append("tags", t));
  if (params.word_min != null) qs.set("word_min", String(params.word_min));
  if (params.word_max != null) qs.set("word_max", String(params.word_max));
  if (params.updated_after) qs.set("updated_after", params.updated_after);
  if (params.updated_before) qs.set("updated_before", params.updated_before);
  if (params.sort) qs.set("sort", params.sort);
  return request<Book[]>(`/api/discover?${qs.toString()}`, signal);
}

// 兼容旧筛选接口
export function fetchFilteredBooks(params: DiscoverParams = {}, signal?: AbortSignal): Promise<Book[]> {
  return fetchDiscover(params, signal);
}

// 封面图地址
export function coverUrl(bookId: string): string {
  return `/api/cover/${encodeURIComponent(bookId)}`;
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthStatus> {
  return request<HealthStatus>("/api/health", signal);
}

// ===================== 管理 API =====================

async function mutate<T>(method: string, url: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = adminHeaders(
    isForm ? {} : { "Content-Type": "application/json" }
  );
  // FormData 不要设 Content-Type，浏览器会带 boundary
  if (isForm) delete headers["Content-Type"];

  const res = await fetch(url, {
    method,
    headers,
    body: isForm ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `操作失败 ${res.status}`;
    if (res.status === 401) {
      msg = "认证失败：请在本页填写与后端 ADMIN_API_KEY 一致的管理密钥";
    } else {
      try {
        const data = await res.json();
        if (data.detail) msg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      } catch {
        /* ignore */
      }
    }
    throw new Error(msg);
  }
  if (res.status === 204) return { ok: true } as T;
  return res.json();
}

export function adminCreateBook(payload: AdminCreateBookPayload): Promise<Book> {
  return mutate<Book>("POST", "/api/admin/books", payload);
}

export function adminUpdateBook(bookId: string, payload: AdminUpdateBookPayload): Promise<Book> {
  return mutate<Book>(
    "PUT",
    `/api/admin/books/${encodeURIComponent(bookId)}`,
    payload
  );
}

export function adminRenameBook(bookId: string, newId: string): Promise<Book> {
  return mutate<Book>("POST", `/api/admin/books/${encodeURIComponent(bookId)}/rename`, {
    new_id: newId,
  });
}

export function adminDeleteBook(bookId: string): Promise<{ ok: boolean }> {
  return mutate<{ ok: boolean }>("DELETE", `/api/admin/books/${encodeURIComponent(bookId)}`);
}

export function adminCreateChapter(bookId: string, payload: AdminCreateChapterPayload): Promise<BookDetail> {
  return mutate<BookDetail>(
    "POST",
    `/api/admin/books/${encodeURIComponent(bookId)}/chapters`,
    payload
  );
}

export function adminUpdateChapter(bookId: string, chapterId: string, payload: AdminCreateChapterPayload): Promise<BookDetail> {
  return mutate<BookDetail>(
    "PUT",
    `/api/admin/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(chapterId)}`,
    payload
  );
}

export function adminDeleteChapter(bookId: string, chapterId: string): Promise<BookDetail> {
  return mutate<BookDetail>(
    "DELETE",
    `/api/admin/books/${encodeURIComponent(bookId)}/chapters/${encodeURIComponent(chapterId)}`
  );
}

export function adminImportText(bookId: string, text: string): Promise<BookDetail> {
  return mutate<BookDetail>(
    "POST",
    `/api/admin/books/${encodeURIComponent(bookId)}/import`,
    { text }
  );
}

export function adminUploadCover(bookId: string, file: File): Promise<Book> {
  const fd = new FormData();
  fd.append("file", file);
  return mutate<Book>(
    "POST",
    `/api/admin/books/${encodeURIComponent(bookId)}/cover`,
    fd
  );
}

export function adminReorderChapters(bookId: string, order: number[]): Promise<BookDetail> {
  return mutate<BookDetail>(
    "PUT",
    `/api/admin/books/${encodeURIComponent(bookId)}/chapters/reorder`,
    { order }
  );
}

export function adminSetTags(bookId: string, tags: string[]): Promise<{ tags: string[] }> {
  return mutate<{ tags: string[] }>(
    "PUT",
    `/api/admin/books/${encodeURIComponent(bookId)}/tags`,
    { tags }
  );
}

export function adminReindex(): Promise<{ books: number; chapters: number }> {
  return mutate<{ books: number; chapters: number }>("POST", "/api/admin/reindex");
}

// ===================== 用户认证 API =====================

const TOKEN_KEY = "novel-token";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: token } : {};
}

async function authRequest<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `请求失败 ${res.status}`);
  }
  return res.json();
}

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function apiRegister(username: string, password: string): Promise<{ token: string; user: User }> {
  return authRequest<{ token: string; user: User }>("/api/auth/register", { username, password });
}

export function apiLogin(username: string, password: string): Promise<{ token: string; user: User }> {
  return authRequest<{ token: string; user: User }>("/api/auth/login", { username, password });
}

export function apiMe(signal?: AbortSignal): Promise<User> {
  const token = getToken();
  if (!token) return Promise.reject(new Error("not logged in"));
  return fetch("/api/auth/me", {
    headers: { Authorization: token },
    signal,
  }).then((res) => {
    if (!res.ok) throw new Error("auth failed");
    return res.json();
  });
}

function authFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) return Promise.reject(new Error("not logged in"));
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}), Authorization: token };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, { ...options, headers }).then((res) => {
    if (!res.ok) {
      if (res.status === 401) { setToken(""); }
      return res.json().then((d) => { throw new Error(d.detail || `请求失败 ${res.status}`); });
    }
    if (res.status === 204) return { ok: true } as T;
    return res.json();
  });
}

export function apiFavorites(signal?: AbortSignal): Promise<Book[]> {
  return authFetch<Book[]>("/api/user/favorites", { signal });
}

export function apiAddFavorite(bookId: string): Promise<{ ok: boolean }> {
  return authFetch<{ ok: boolean }>(`/api/user/favorites/${encodeURIComponent(bookId)}`, { method: "POST" });
}

export function apiRemoveFavorite(bookId: string): Promise<{ ok: boolean }> {
  return authFetch<{ ok: boolean }>(`/api/user/favorites/${encodeURIComponent(bookId)}`, { method: "DELETE" });
}

export function apiGetProgress(signal?: AbortSignal): Promise<CloudProgress[]> {
  return authFetch<CloudProgress[]>("/api/user/progress", { signal });
}

export function apiSaveProgress(data: { book_id: string; chapter_id: string; scroll_top: number; progress: number; minutes: number }): Promise<{ ok: boolean }> {
  return authFetch<{ ok: boolean }>("/api/user/progress", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function apiGetStats(signal?: AbortSignal): Promise<import("./types.ts").ReadingStats> {
  return authFetch<import("./types.ts").ReadingStats>("/api/user/stats", { signal });
}