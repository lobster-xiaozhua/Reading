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
export declare function useReaderCache({ fetcher, chapters, maxCache, preloadRadius, }: UseReaderCacheOptions): UseReaderCacheReturn;
//# sourceMappingURL=useReaderCache.d.ts.map