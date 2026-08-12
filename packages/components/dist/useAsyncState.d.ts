export type AsyncStatus = "idle" | "loading" | "success" | "error";
export interface AsyncState<T> {
    status: AsyncStatus;
    data: T | null;
    error: Error | null;
    /** 是否已完成至少一次成功加载（用于区分首次加载与刷新） */
    loaded: boolean;
}
export interface UseAsyncStateOptions {
    /** 首次加载延迟超过该阈值才显示 loading，避免闪烁（ms），默认 1000 */
    loadingDelay?: number;
    /** 是否在挂载时自动执行，默认 true */
    immediate?: boolean;
    /** 依赖项；任一变化时自动重新执行（类似 useEffect deps） */
    deps?: unknown[];
    /** 初始 data 值（避免首屏 null 闪烁，常用于空数组） */
    initial?: unknown;
}
export interface UseAsyncStateReturn<T> extends AsyncState<T> {
    /** 发起请求；同一时刻仅允许一个进行中的请求 */
    run: (...args: unknown[]) => Promise<T | null>;
    /** 重置为初始 idle 状态 */
    reset: () => void;
    /** 手动更新数据（不触发请求） */
    setData: (data: T | null | ((prev: T | null) => T | null)) => void;
    /** 当前是否有进行中的请求 */
    isLoading: boolean;
    /** isLoading 别名，便于 JSX 简写 */
    loading: boolean;
}
/**
 * 异步状态管理 Hook。
 * 用法：
 *   const { status, data, error, run } = useAsyncState(fetchBooks);
 *   useEffect(() => { run(); }, []);
 */
export declare function useAsyncState<T>(asyncFn: (...args: unknown[]) => Promise<T>, options?: UseAsyncStateOptions): UseAsyncStateReturn<T>;
//# sourceMappingURL=useAsyncState.d.ts.map