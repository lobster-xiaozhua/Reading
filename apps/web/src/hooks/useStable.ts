/* ============================================================
 * useStable · 稳定引用 hook
 * 避免 useCallback/useMemo 因依赖变化导致子组件重渲染
 * ============================================================ */
import { useRef } from "react";

/**
 * 返回一个稳定的函数引用，始终调用最新版本
 * 适用于传给子组件的回调，避免因闭包重建导致 React.memo 失效
 */
export function useStable<T extends (...args: never[]) => unknown>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  return useRef((...args: Parameters<T>) => ref.current(...args)).current as T;
}