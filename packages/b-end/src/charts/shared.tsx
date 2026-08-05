/* ============================================================
 * P7-3/4/5/6 · 图表共享配置
 * - 样式规范：高度 320 / 坐标轴 12px text-tertiary / 图例 13px text-secondary
 * - Tooltip：bg-elevated + text-inverse + sh-2 + radius-md
 * - 空数据占位：EmptyState 居中
 * - 暗黑模式：theme 切换 + chart-3 提亮（由 tokens 处理）
 * - 色板：从 CSS 变量读取 chart-1~6
 * Source: 04 §7 / 02 §4 / P7-3~6
 * ============================================================ */

import { Empty } from 'antd';
import type { CSSProperties } from 'react';
import { tokens } from '@novel/tokens';

/** 图表默认高度（04 §7.2） */
export const CHART_DEFAULT_HEIGHT = 320;

/** 图表容器默认样式 */
export const CHART_CONTAINER_STYLE: CSSProperties = {
  width: '100%',
  height: CHART_DEFAULT_HEIGHT,
  padding: 'var(--space-4)',
};

/**
 * SSR / 兜底色板（取自 @novel/tokens，避免裸色值）
 * 与 packages/tokens/src/styles/primitive.css 一致
 */
const CHART_COLOR_FALLBACKS: ReadonlyArray<string> = [
  tokens.color.chart.chart1,
  tokens.color.chart.chart2,
  tokens.color.chart.chart3,
  tokens.color.chart.chart4,
  tokens.color.chart.chart5,
  tokens.color.chart.chart6,
];

/**
 * 从 CSS 变量读取图表色板（运行时）
 * 用于将 `var(--color-chart-1)` 解析为实际色值传给 @ant-design/charts
 */
export function getChartColors(): string[] {
  if (typeof window === 'undefined') {
    return [...CHART_COLOR_FALLBACKS];
  }
  const root = getComputedStyle(document.documentElement);
  return [
    root.getPropertyValue('--color-chart-1').trim() || CHART_COLOR_FALLBACKS[0]!,
    root.getPropertyValue('--color-chart-2').trim() || CHART_COLOR_FALLBACKS[1]!,
    root.getPropertyValue('--color-chart-3').trim() || CHART_COLOR_FALLBACKS[2]!,
    root.getPropertyValue('--color-chart-4').trim() || CHART_COLOR_FALLBACKS[3]!,
    root.getPropertyValue('--color-chart-5').trim() || CHART_COLOR_FALLBACKS[4]!,
    root.getPropertyValue('--color-chart-6').trim() || CHART_COLOR_FALLBACKS[5]!,
  ];
}

/** 检测当前是否暗黑模式（data-theme='dark'） */
export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/** 通用坐标轴样式（04 §7.2） */
export const commonAxisStyle = {
  axis: {
    x: {
      labelFontSize: 12,
      labelFill: 'var(--color-text-tertiary)',
      lineStroke: 'var(--color-border-subtle)',
    },
    y: {
      labelFontSize: 12,
      labelFill: 'var(--color-text-tertiary)',
      gridStroke: 'var(--color-border-subtle)',
      gridLineDash: [2, 2],
    },
  },
} as const;

/** 通用图例样式（04 §7.2） */
export const commonLegendStyle = {
  legend: {
    color: {
      itemLabelFontSize: 13,
      itemLabelFill: 'var(--color-text-secondary)',
      itemMarkerSize: 10,
    },
  },
} as const;

/** 通用 Tooltip 样式（04 §7.2） */
export const commonTooltipStyle = {
  tooltip: {
    style: {
      fontSize: 13,
      background: 'var(--color-bg-elevated)',
      color: 'var(--color-text-inverse)',
      boxShadow: 'var(--sh-2)',
      borderRadius: 'var(--radius-md, 8px)',
      padding: '8px 12px',
    },
  },
} as const;

/** 空数据占位（P7-5） */
export function renderChartEmpty(description = '暂无数据'): React.ReactNode {
  return (
    <div
      style={{
        height: CHART_DEFAULT_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Empty description={description} />
    </div>
  );
}

/** 图表容器包装：处理空数据 + 加载态 */
export interface ChartWrapperProps {
  /** 是否为空数据 */
  empty?: boolean;
  /** 空数据描述 */
  emptyDescription?: string;
  /** 高度（默认 320） */
  height?: number;
  /** 子节点（空数据时可不传） */
  children?: React.ReactNode;
}

export function ChartWrapper({ empty, emptyDescription, height = CHART_DEFAULT_HEIGHT, children }: ChartWrapperProps) {
  if (empty) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description={emptyDescription ?? '暂无数据'} />
      </div>
    );
  }
  return <div style={{ width: '100%', height }}>{children}</div>;
}
