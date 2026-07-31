/* ============================================================
 * useOfflineCache · P7-6
 * 离线阅读：IndexedDB 持久化已读章节内容 + 书架元数据
 *   - 50MB LRU 上限：超限按 lastAccess 淘汰最旧
 *   - 章节正文 Cache-first：先查 IDB，未命中再请求网络并回写
 *   - 书架元数据持久化：离线可浏览书架列表
 * ============================================================ */

import { useCallback, useEffect, useState } from 'react';

const DB_NAME = 'atlas-offline';
const DB_VERSION = 1;
const STORE_CHAPTERS = 'chapters'; // 已读章节正文缓存
const STORE_SHELF = 'shelf'; // 书架元数据
const STORE_META = 'meta'; // 元信息（如总缓存大小）
const MAX_BYTES = 50 * 1024 * 1024; // 50MB LRU 上限

export interface CachedChapterRecord {
  /** 主键：`${bookId}:${chapterId}` */
  key: string;
  bookId: string;
  chapterId: string;
  title: string;
  content: string;
  size: number;
  lastAccess: number;
}

export interface ShelfRecord {
  bookId: string;
  /** 序列化的 Book 摘要 */
  data: unknown;
  lastAccess: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
        const s = db.createObjectStore(STORE_CHAPTERS, { keyPath: 'key' });
        s.createIndex('byLastAccess', 'lastAccess');
        s.createIndex('byBook', 'bookId');
      }
      if (!db.objectStoreNames.contains(STORE_SHELF)) {
        db.createObjectStore(STORE_SHELF, { keyPath: 'bookId' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => resolve(null);
  });
}

function estimateSize(s: string): number {
  return s.length * 2; // UTF-16 近似
}

/* ---------- LRU 淘汰：超过 50MB 或 500 章时按 lastAccess 升序删除 ---------- */
async function evictIfNeeded(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  // 取出全部记录（用于累计大小 + 排序）
  const all = await tx<CachedChapterRecord[]>(STORE_CHAPTERS, 'readonly', (s) => {
    return s.getAll() as IDBRequest<CachedChapterRecord[]>;
  });
  if (!all || all.length === 0) return;
  // 双重上限：50MB 字节量 或 500 章数量
  const totalBytes = all.reduce((s, r) => s + (r.size ?? 0), 0);
  if (totalBytes <= MAX_BYTES && all.length < 500) return;
  // 按 lastAccess 升序，删除最旧 20%
  all.sort((a, b) => a.lastAccess - b.lastAccess);
  const removeCount = Math.max(1, Math.ceil(all.length * 0.2));
  for (let i = 0; i < removeCount; i++) {
    await tx(STORE_CHAPTERS, 'readwrite', (s) => s.delete(all[i].key));
  }
}

export interface OfflineCache {
  /** 是否可用（IndexedDB 存在） */
  available: boolean;
  /** 读取缓存的章节正文 */
  getChapter: (bookId: string, chapterId: string) => Promise<CachedChapterRecord | null>;
  /** 写入章节正文缓存（含 LRU 淘汰） */
  putChapter: (bookId: string, chapterId: string, title: string, content: string) => Promise<void>;
  /** 读取全部离线书架 */
  getShelf: () => Promise<ShelfRecord[]>;
  /** 写入/更新书架项 */
  putShelfItem: (bookId: string, data: unknown) => Promise<void>;
  /** 移除书架项 */
  removeShelfItem: (bookId: string) => Promise<void>;
  /** 清空全部离线缓存 */
  clearAll: () => Promise<void>;
}

/**
 * 离线缓存 Hook。组件级单例（IDB 本身是全局共享）。
 */
export function useOfflineCache(): OfflineCache {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    openDB().then((db) => setAvailable(!!db));
  }, []);

  const getChapter = useCallback(
    async (bookId: string, chapterId: string): Promise<CachedChapterRecord | null> => {
      const key = `${bookId}:${chapterId}`;
      const rec = await tx<CachedChapterRecord>(STORE_CHAPTERS, 'readonly', (s) => s.get(key));
      if (rec) {
        // 异步刷新 lastAccess，不阻塞读取
        tx(STORE_CHAPTERS, 'readwrite', (s) =>
          s.put({ ...rec, lastAccess: Date.now() }),
        );
      }
      return rec ?? null;
    },
    [],
  );

  const putChapter = useCallback(
    async (bookId: string, chapterId: string, title: string, content: string): Promise<void> => {
      const key = `${bookId}:${chapterId}`;
      const size = estimateSize(content);
      const record: CachedChapterRecord = {
        key,
        bookId,
        chapterId,
        title,
        content,
        size,
        lastAccess: Date.now(),
      };
      await tx(STORE_CHAPTERS, 'readwrite', (s) => s.put(record));
      await evictIfNeeded();
    },
    [],
  );

  const getShelf = useCallback(async (): Promise<ShelfRecord[]> => {
    const all = await tx<ShelfRecord[]>(STORE_SHELF, 'readonly', (s) => s.getAll() as IDBRequest<ShelfRecord[]>);
    return all ?? [];
  }, []);

  const putShelfItem = useCallback(
    async (bookId: string, data: unknown): Promise<void> => {
      await tx(STORE_SHELF, 'readwrite', (s) =>
        s.put({ bookId, data, lastAccess: Date.now() } as ShelfRecord),
      );
    },
    [],
  );

  const removeShelfItem = useCallback(async (bookId: string): Promise<void> => {
    await tx(STORE_SHELF, 'readwrite', (s) => s.delete(bookId));
  }, []);

  const clearAll = useCallback(async (): Promise<void> => {
    await tx(STORE_CHAPTERS, 'readwrite', (s) => s.clear());
    await tx(STORE_SHELF, 'readwrite', (s) => s.clear());
  }, []);

  return {
    available,
    getChapter,
    putChapter,
    getShelf,
    putShelfItem,
    removeShelfItem,
    clearAll,
  };
}
