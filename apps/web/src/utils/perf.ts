/* ============================================================
 * perf · P8 性能指标埋点（03 §9.1）
 * 采集 LCP / INP / CLS / TTI / 章节切换耗时，统一上报
 *   - 上报通道：sendRum（sendBeacon，不可用时回退 fetch keepalive）
 *   - 采样：开发环境控制台输出，生产环境上报到 RUM 端点
 *   - 指标阈值：LCP<1.5s / INP<200ms / CLS<0.1 / TTI<3s / 章节切换<300ms
 * ============================================================ */

import { sendRum } from './report';

interface PerfMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
}

const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [1500, 2500],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  TTI: [3000, 5000],
  'chapter-switch': [300, 800],
};

function rate(name: string, value: number): PerfMetric['rating'] {
  const t = THRESHOLDS[name];
  if (!t) return 'good';
  if (value <= t[0]) return 'good';
  if (value <= t[1]) return 'needs-improvement';
  return 'poor';
}

const buffer: PerfMetric[] = [];

function report(metric: PerfMetric): void {
  buffer.push(metric);
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('perf-metric', { detail: metric }));
    }
  } else {
    // 生产环境：统一经 sendRum 上报 RUM 端点
    sendRum({ type: 'perf', name: metric.name, value: metric.value, rating: metric.rating });
  }
}

/* ---------- LCP / CLS（基于 PerformanceObserver） ---------- */

let lcpValue = 0;
let clsValue = 0;

export function initPerfObservers(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  // LCP
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        lcpValue = last.startTime;
        report({ name: 'LCP', value: lcpValue, rating: rate('LCP', lcpValue) });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    /* LCP 不支持 */
  }

  // CLS
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShift.hadRecentInput && layoutShift.value) {
          clsValue += layoutShift.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* CLS 不支持 */
  }

  // INP（event-duration）
  try {
    let worstInp = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const dur = entry.duration || 0;
        if (dur > worstInp) {
          worstInp = dur;
        }
      }
    }).observe({ type: 'event', buffered: true });
    // 页面隐藏时上报 INP
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && worstInp > 0) {
        report({ name: 'INP', value: worstInp, rating: rate('INP', worstInp) });
        worstInp = 0;
      }
    });
  } catch {
    /* INP 不支持 */
  }

  // TTI（首次可交互时间近似：domContentLoadedEventEnd - navigationStart）
  window.addEventListener('load', () => {
    setTimeout(() => {
      const [nav] = performance.getEntriesByType('navigation');
      if (nav) {
        const tti = (nav as PerformanceNavigationTiming).domContentLoadedEventEnd;
        if (tti > 0) {
          report({ name: 'TTI', value: tti, rating: rate('TTI', tti) });
        }
      }
      // 页面隐藏时上报 CLS 终值
      if (clsValue > 0) {
        report({ name: 'CLS', value: clsValue, rating: rate('CLS', clsValue) });
      }
    }, 0);
  });
}

/* ---------- 章节切换耗时埋点（P4-1 验收） ---------- */

const chapterMarks = new Map<string, number>();

/**
 * 标记章节切换开始
 * @param chapterId 章节唯一标识
 */
export function markChapterStart(chapterId: string): void {
  chapterMarks.set(chapterId, performance.now());
  try {
    performance.mark(`chapter-${chapterId}-start`);
  } catch {
    /* mark 失败忽略 */
  }
}

/**
 * 标记章节切换结束并上报耗时
 */
export function markChapterEnd(chapterId: string): void {
  const start = chapterMarks.get(chapterId);
  if (start == null) return;
  const duration = performance.now() - start;
  report({ name: 'chapter-switch', value: duration, rating: rate('chapter-switch', duration) });
  chapterMarks.delete(chapterId);
  try {
    performance.mark(`chapter-${chapterId}-end`);
    performance.measure(
      `chapter-${chapterId}`,
      `chapter-${chapterId}-start`,
      `chapter-${chapterId}-end`,
    );
  } catch {
    /* measure 失败忽略 */
  }
}

/**
 * 获取当前已采集的指标（开发调试用）
 */
export function getCollectedMetrics(): readonly PerfMetric[] {
  return buffer;
}
