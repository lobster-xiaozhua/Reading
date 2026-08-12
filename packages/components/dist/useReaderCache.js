/* ============================================================
 * useReaderCache · 03 §5.3.3 / §9.5 / §6.3
 * 阅读器章节缓存 + 预加载策略：
 *   - 当前章 ±2 章预加载，后台静默加载无动画
 *   - LRU 淘汰，内存最多 5 章
 *   - 切换章节优先用缓存，缓存未命中显示加载条
 * ============================================================ */
import { useCallback, useEffect, useRef, useState } from "react";
/**
 * LRU 缓存：Map 的插入顺序天然支持 LRU，访问时 delete+set 提到末尾。
 */
class LruCache {
    max;
    map = new Map();
    constructor(max) {
        this.max = max;
    }
    get(key) {
        const v = this.map.get(key);
        if (v !== undefined) {
            // 提到末尾（最近使用）
            this.map.delete(key);
            this.map.set(key, v);
        }
        return v;
    }
    set(key, value) {
        if (this.map.has(key))
            this.map.delete(key);
        else if (this.map.size >= this.max) {
            // 淘汰最旧（第一个）
            const oldest = this.map.keys().next().value;
            if (oldest !== undefined)
                this.map.delete(oldest);
        }
        this.map.set(key, value);
    }
    has(key) {
        return this.map.has(key);
    }
    get size() {
        return this.map.size;
    }
}
export function useReaderCache({ fetcher, chapters, maxCache = 5, preloadRadius = 2, }) {
    const cacheRef = useRef(new LruCache(maxCache));
    // 进行中的请求去重：避免同 id 并发触发
    const inflightRef = useRef(new Map());
    const [currentId, setCurrentId] = useState(chapters[0]?.id ?? null);
    const [current, setCurrent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const currentIndex = chapters.findIndex((c) => c.id === currentId);
    const prevId = currentIndex > 0 ? chapters[currentIndex - 1].id : null;
    const nextId = currentIndex >= 0 && currentIndex < chapters.length - 1
        ? chapters[currentIndex + 1].id
        : null;
    /** 拉取单章并写入缓存；返回 cached chapter */
    const loadChapter = useCallback(async (id) => {
        const cached = cacheRef.current.get(id);
        if (cached)
            return cached;
        const inflight = inflightRef.current.get(id);
        if (inflight)
            return inflight;
        // 指数退避重试
        const RETRY_MAX = 2;
        const RETRY_DELAYS = [300, 1000];
        const fetchWithRetry = async () => {
            for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
                try {
                    const result = await fetcher(id);
                    cacheRef.current.set(id, result);
                    inflightRef.current.delete(id);
                    return result;
                }
                catch (err) {
                    if (attempt >= RETRY_MAX)
                        throw err;
                    const delay = RETRY_DELAYS[attempt] ?? 1000;
                    await new Promise((r) => setTimeout(r, delay));
                }
            }
            throw new Error("章节加载失败");
        };
        const p = fetchWithRetry();
        inflightRef.current.set(id, p);
        return p;
    }, [fetcher]);
    /** 切换当前章节 */
    const goto = useCallback((chapterId) => {
        if (chapterId === currentId)
            return;
        setCurrentId(chapterId);
    }, [currentId]);
    // 当前章节加载（缓存命中无 loading 态，未命中显示 loading）
    useEffect(() => {
        if (!currentId)
            return;
        let cancelled = false;
        const cached = cacheRef.current.get(currentId);
        if (cached) {
            setCurrent(cached);
            setLoading(false);
            setError(null);
        }
        else {
            setLoading(true);
            setError(null);
            loadChapter(currentId)
                .then((ch) => {
                if (cancelled)
                    return;
                setCurrent(ch);
                setLoading(false);
            })
                .catch((err) => {
                if (cancelled)
                    return;
                // 加载失败后，自动尝试加载上一章（如果存在）
                const fallbackId = prevId;
                if (fallbackId && fallbackId !== currentId) {
                    loadChapter(fallbackId)
                        .then((fallback) => {
                        if (cancelled)
                            return;
                        setCurrent(fallback);
                        setLoading(false);
                    })
                        .catch(() => {
                        if (cancelled)
                            return;
                        setError(err instanceof Error ? err : new Error(String(err)));
                        setLoading(false);
                    });
                }
                else {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setLoading(false);
                }
            });
        }
        return () => {
            cancelled = true;
        };
    }, [currentId, loadChapter, prevId]);
    // 预加载 ±N 章（后台静默，不触发 loading/error）
    useEffect(() => {
        if (currentIndex < 0)
            return;
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
//# sourceMappingURL=useReaderCache.js.map