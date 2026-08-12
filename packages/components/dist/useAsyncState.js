/* ============================================================
 * useAsyncState · 02 §2 通用状态模式
 * 封装异步数据加载的状态机：idle / loading / success / error
 * 配合 EmptyState / Skeleton / ErrorState 实现 6 种状态模式
 * ============================================================ */
import { useCallback, useEffect, useRef, useState } from "react";
/**
 * 异步状态管理 Hook。
 * 用法：
 *   const { status, data, error, run } = useAsyncState(fetchBooks);
 *   useEffect(() => { run(); }, []);
 */
export function useAsyncState(asyncFn, options = {}) {
    const { loadingDelay = 1000, immediate = true, deps = [], initial } = options;
    const [state, setState] = useState({
        status: "idle",
        data: initial ?? null,
        error: null,
        loaded: false,
    });
    /* 使用 ref 持有 asyncFn，避免因内联函数引用变化导致无限循环 */
    const asyncFnRef = useRef(asyncFn);
    asyncFnRef.current = asyncFn;
    const runningRef = useRef(null);
    const runSeqRef = useRef(0);
    const mountedRef = useRef(true);
    const delayTimerRef = useRef(null);
    const loadedRef = useRef(state.loaded);
    loadedRef.current = state.loaded;
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (delayTimerRef.current)
                clearTimeout(delayTimerRef.current);
        };
    }, []);
    const run = useCallback(async (...args) => {
        // 同周期内已有进行中的请求则复用，避免重复触发（如双击）
        if (runningRef.current)
            return runningRef.current;
        // 延迟显示 loading（仅在未加载过数据时）
        if (!loadedRef.current && loadingDelay > 0) {
            delayTimerRef.current = setTimeout(() => {
                if (mountedRef.current) {
                    setState((s) => ({ ...s, status: "loading" }));
                }
            }, loadingDelay);
        }
        else {
            setState((s) => ({ ...s, status: "loading" }));
        }
        const seq = ++runSeqRef.current;
        const promise = Promise.resolve(asyncFnRef.current(...args));
        runningRef.current = promise;
        try {
            const data = await promise;
            // 请求已被更新周期取代（deps 变化 / 组件卸载）时丢弃旧结果，避免旧响应覆盖新状态
            if (!mountedRef.current || seq !== runSeqRef.current)
                return data;
            setState({
                status: "success",
                data,
                error: null,
                loaded: true,
            });
            return data;
        }
        catch (err) {
            if (!mountedRef.current || seq !== runSeqRef.current)
                return null;
            const error = err instanceof Error ? err : new Error(String(err));
            setState((s) => ({
                ...s,
                status: "error",
                error,
                loaded: true,
            }));
            return null;
        }
        finally {
            runningRef.current = null;
            if (delayTimerRef.current) {
                clearTimeout(delayTimerRef.current);
                delayTimerRef.current = null;
            }
        }
    }, 
    // asyncFnRef used: stable ref, no need to re-create run on asyncFn change
    [loadingDelay]);
    const reset = useCallback(() => {
        if (delayTimerRef.current)
            clearTimeout(delayTimerRef.current);
        runningRef.current = null;
        setState({ status: "idle", data: null, error: null, loaded: false });
    }, []);
    const setData = useCallback((data) => {
        setState((s) => ({
            ...s,
            data: typeof data === "function"
                ? data(s.data)
                : data,
            status: "success",
        }));
    }, []);
    // 自动执行：首次挂载 + deps 变化时重新执行；deps 变化即作废上一周期在飞请求
    const immediateRef = useRef(immediate);
    const depsKey = JSON.stringify(deps);
    useEffect(() => {
        mountedRef.current = true;
        // 作废上一周期在飞请求并解除并发阻塞，允许新请求发起
        runSeqRef.current++;
        runningRef.current = null;
        if (immediateRef.current) {
            run();
        }
        return () => {
            mountedRef.current = false;
            // 递增代数作废在飞请求（有意在 cleanup 中修改 ref 值）
            // eslint-disable-next-line react-hooks/exhaustive-deps
            runSeqRef.current++;
            runningRef.current = null;
            if (delayTimerRef.current)
                clearTimeout(delayTimerRef.current);
        };
        // immediateRef omitted: ref is stable, never changes after mount
    }, [depsKey, run]);
    return {
        ...state,
        run,
        reset,
        setData,
        isLoading: state.status === "loading",
        loading: state.status === "loading",
    };
}
//# sourceMappingURL=useAsyncState.js.map