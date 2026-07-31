/* ============================================================
 * useReaderCache · 03 §5.3.3 / §9.5 / §6.3
 * 阅读器章节缓存 + 预加载策略：
 *   - 当前章 ±2 章预加载，后台静默加载无动画
 *   - LRU 淘汰，内存最多 5 章
 *   - 切换章节优先用缓存，缓存未命中显示加载条
 * ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react';

/** 章节数据契约（Reader 容器消费） */
export interface CachedChapter {
  id: string;
  title: string;
  content: string;
}

/** 章节获取器：根据章节 id 返回 Promise<章节>；失败抛错 */
export type ChapterFetcher = (chapterId: string) => Promise<CachedChapter>;

/** 章节列表项（用于 ±2 预加载定位） */
export interface ChapterRef {
  id: string;
}

export interface UseReaderCacheOptions {
  /** 章节获取器（必填） */
  fetcher: ChapterFetcher;
  /** 全部章节引用列表（按顺序），用于 ±2 预加载定位 */
  chapters: ChapterRef[];
  /** LRU 最大容量，默认 5 */
  maxCache?: number;
  /** 预加载范围（前后各 N 章），默认 2 */
  preloadRadius?: number;
}

export interface UseReaderCacheReturn {
  /** 当前章节数据（缓存命中立即返回，未命中为 null + loading=true） */
  current: CachedChapter | null;
  /** 当前章节加载中 */
  loading: boolean;
  /** 当前章节加载错误 */
  error: Error | null;
  /** 切换到指定章节 id */
  goto: (chapterId: string) => void;
  /** 上一章 id（无则 null） */
  prevId: string | null;
  /** 下一章 id（无则 null） */
  nextId: string | null;
  /** 当前章节在 chapters 中的序号（0-based）；未找到为 -1 */
  currentIndex: number;
  /** 缓存命中数（用于性能观测） */
  cacheSize: number;
}

/**
 * LRU 缓存：Map 的插入顺序天然支持 LRU，访问时 delete+set 提到末尾。
 */
class LruCache<K, V> {
  private map = new Map<K, V>();
  constructor(private readonly max: number) {}

  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (v !== undefined) {
      // 提到末尾（最近使用）
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.max) {
      // 淘汰最旧（第一个）
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  get size(): number {
    return this.map.size;
  }
}

export function useReaderCache({
  fetcher,
  chapters,
  maxCache = 5,
  preloadRadius = 2,
}: UseReaderCacheOptions): UseReaderCacheReturn {
  const cacheRef = useRef<LruCache<string, CachedChapter>>(new LruCache(maxCache));
  // 进行中的请求去重：避免同 id 并发触发
  const inflightRef = useRef<Map<string, Promise<CachedChapter>>>(new Map());
  const [currentId, setCurrentId] = useState<string | null>(
    chapters[0]?.id ?? null,
  );
  const [current, setCurrent] = useState<CachedChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const currentIndex = chapters.findIndex((c) => c.id === currentId);
  const prevId = currentIndex > 0 ? chapters[currentIndex - 1].id : null;
  const nextId =
    currentIndex >= 0 && currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1].id
      : null;

  /** 拉取单章并写入缓存；返回 cached chapter */
  const loadChapter = useCallback(
    async (id: string): Promise<CachedChapter> => {
      const cached = cacheRef.current.get(id);
      if (cached) return cached;
      const inflight = inflightRef.current.get(id);
      if (inflight) return inflight;
      const p = fetcher(id)
        .then((ch) => {
          cacheRef.current.set(id, ch);
          inflightRef.current.delete(id);
          return ch;
        })
        .catch((err) => {
          inflightRef.current.delete(id);
          throw err;
        });
      inflightRef.current.set(id, p);
      return p;
    },
    [fetcher],
  );

  /** 切换当前章节 */
  const goto = useCallback(
    (chapterId: string) => {
      if (chapterId === currentId) return;
      setCurrentId(chapterId);
    },
    [currentId],
  );

  // 当前章节加载（缓存命中无 loading 态，未命中显示 loading）
  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;

    const cached = cacheRef.current.get(currentId);
    if (cached) {
      setCurrent(cached);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
      loadChapter(currentId)
        .then((ch) => {
          if (cancelled) return;
          setCurrent(ch);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [currentId, loadChapter]);

  // 预加载 ±N 章（后台静默，不触发 loading/error）
  useEffect(() => {
    if (currentIndex < 0) return;
    const start = Math.max(0, currentIndex - preloadRadius);
    const end = Math.min(chapters.length - 1, currentIndex + preloadRadius);
    for (let i = start; i <= end; i++) {
      const id = chapters[i].id;
      if (!cacheRef.current.has(id) && !inflightRef.current.has(id)) {
        // 静默预加载，错误吞掉（不影响当前章）
        loadChapter(id).catch(() => {
          /* 预加载失败静默忽略 */
        });
      }
    }
  }, [currentIndex, chapters, preloadRadius, loadChapter]);

  return {
    current,
    loading,
    error,
    goto,
    prevId,
    nextId,
    currentIndex,
    cacheSize: cacheRef.current.size,
  };
}
