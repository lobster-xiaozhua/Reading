import { useState, useEffect, useRef, useCallback } from "react";

/**
 * 通用请求 hook：自动管理 AbortController 生命周期
 * 替代手动 useEffect + new AbortController() + return () => ac.abort() 模式
 *
 * 用法：
 *   const { data, loading, error, refetch } = useRequest(
 *     (signal) => fetchBooks(signal),
 *     []
 *   );
 *
 * 对比手动模式：
 *   ✅ 自动取消旧请求（防竞态）
 *   ✅ 自动处理 AbortError（不污染 error 状态）
 *   ✅ loading / error 状态自动管理
 *   ✅ 组件卸载自动取消（内存泄漏防护）
 *   ✅ 提供 refetch 手动刷新
 */
export function useRequest(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // 取消上一次未完成的请求，防止竞态
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    fetchFn(ac.signal)
      .then((d) => {
        if (mountedRef.current && !ac.signal.aborted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (mountedRef.current && e.name !== "AbortError") {
          setError(e.message || String(e));
          setLoading(false);
        }
        // AbortError 静默忽略
      });

    return () => {
      mountedRef.current = false;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  return { data, loading, error, refetch };
}