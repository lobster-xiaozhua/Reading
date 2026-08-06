/* ============================================================
 * usePerfMonitor · 开发环境渲染性能监控
 * 记录组件挂载/卸载/重渲染次数，仅在 dev 模式生效
 * ============================================================ */
import { useEffect, useRef } from "react";

const isDev = import.meta.env.DEV;

/** 重渲染计数器（全局，按组件名统计） */
const renderCounts: Record<string, number> = {};

/**
 * 在组件中调用以监控渲染性能
 * @param name 组件名，用于标识
 * @param deps 可选依赖数组，用于追踪特定 prop/state 变化
 */
export function usePerfMonitor(name: string, deps?: unknown[]): void {
  const mountTime = useRef(0);
  const renderCount = useRef(0);

  if (isDev) {
    renderCount.current++;
    renderCounts[name] = (renderCounts[name] ?? 0) + 1;
  }

  useEffect(() => {
    if (!isDev) return;
    const count = renderCount.current;
    mountTime.current = performance.now();
    performance.mark(`${name}:mount`);
    return () => {
      const duration = performance.now() - mountTime.current;
      performance.mark(`${name}:unmount`);
      performance.measure(`${name}:lifecycle`, `${name}:mount`, `${name}:unmount`);
      if (duration > 100) {
        console.warn(`[Perf] ${name} 生命周期 ${duration.toFixed(0)}ms (渲染 ${count} 次)`);
      }
    };
  }, [name]);

  useEffect(() => {
    if (!isDev || !deps) return;
    performance.mark(`${name}:render`);
  });
}

/**
 * 获取组件渲染统计
 */
export function getRenderCounts(): Record<string, number> {
  return { ...renderCounts };
}

/**
 * 重置渲染统计
 */
export function resetRenderCounts(): void {
  for (const key in renderCounts) {
    delete renderCounts[key];
  }
}