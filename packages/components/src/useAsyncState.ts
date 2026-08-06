/* ============================================================
 * useAsyncState · 02 §2 通用状态模式
 * 封装异步数据加载的状态机：idle / loading / success / error
 * 配合 EmptyState / Skeleton / ErrorState 实现 6 种状态模式
 * ============================================================ */

import { useCallback, useEffect, useRef, useState } from "react";

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
export function useAsyncState<T>(
  asyncFn: (...args: unknown[]) => Promise<T>,
  options: UseAsyncStateOptions = {},
): UseAsyncStateReturn<T> {
  const { loadingDelay = 1000, immediate = true, deps = [], initial } = options;
  const [state, setState] = useState<AsyncState<T>>({
    status: "idle",
    data: (initial as T | undefined) ?? null,
    error: null,
    loaded: false,
  });

  /* 使用 ref 持有 asyncFn，避免因内联函数引用变化导致无限循环 */
  const asyncFnRef = useRef(asyncFn);
  asyncFnRef.current = asyncFn;

  const runningRef = useRef<Promise<T> | null>(null);
  const mountedRef = useRef(true);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(state.loaded);
  loadedRef.current = state.loaded;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    };
  }, []);

  const run = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      // 若已有进行中的请求，复用同一 Promise 避免重复触发
      if (runningRef.current) return runningRef.current;

      // 延迟显示 loading（仅在未加载过数据时）
      if (!loadedRef.current && loadingDelay > 0) {
        delayTimerRef.current = setTimeout(() => {
          if (mountedRef.current && runningRef.current) {
            setState((s) => ({ ...s, status: "loading" }));
          }
        }, loadingDelay);
      } else {
        setState((s) => ({ ...s, status: "loading" }));
      }

      const promise = asyncFnRef.current(...args);
      runningRef.current = promise;

      try {
        const data = await promise;
        if (!mountedRef.current) return data;
        setState({
          status: "success",
          data,
          error: null,
          loaded: true,
        });
        return data;
      } catch (err) {
        if (!mountedRef.current) return null;
        const error = err instanceof Error ? err : new Error(String(err));
        setState((s) => ({
          ...s,
          status: "error",
          error,
          loaded: true,
        }));
        return null;
      } finally {
        runningRef.current = null;
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }
      }
    },
    // asyncFnRef used: stable ref, no need to re-create run on asyncFn change
    [loadingDelay],
  );

  const reset = useCallback(() => {
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    runningRef.current = null;
    setState({ status: "idle", data: null, error: null, loaded: false });
  }, []);

  const setData = useCallback<
    (data: T | null | ((prev: T | null) => T | null)) => void
  >((data) => {
    setState((s) => ({
      ...s,
      data:
        typeof data === "function"
          ? (data as (p: T | null) => T | null)(s.data)
          : data,
      status: "success",
    }));
  }, []);

  // 自动执行：首次挂载 + deps 变化时重新执行
  const immediateRef = useRef(immediate);
  const firstRunRef = useRef(true);
  const depsKey = JSON.stringify(deps);
  useEffect(() => {
    if (!immediateRef.current) return;
    // 首次或依赖变化均触发；run 内部已做并发去重
    if (firstRunRef.current) {
      firstRunRef.current = false;
    }
    run();
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
