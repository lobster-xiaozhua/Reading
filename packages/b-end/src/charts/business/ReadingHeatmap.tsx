/* ============================================================
 * P7-8 · 阅读时长热力图
 * 7×24 网格 / 5 档离散色阶 / 单格 ≥12×12px
 * Source: 02 §4.5 / P7-8
 * ============================================================ */

import { useMemo } from 'react';
import { Heatmap } from '@ant-design/charts';
import type { HeatmapConfig } from '@ant-design/charts';
import {
  CHART_DEFAULT_HEIGHT,
  getChartColors,
  isDarkMode,
  commonAxisStyle,
  commonLegendStyle,
  commonTooltipStyle,
  ChartWrapper,
} from '../shared';

export interface ReadingHeatmapDatum {
  /** 0-6（周一到周日） */
  day: number;
  /** 0-23（小时） */
  hour: number;
  /** 阅读时长（分钟） */
  duration: number;
}

export interface ReadingHeatmapProps {
  data: ReadingHeatmapDatum[];
  height?: number;
  emptyDescription?: string;
  config?: Partial<HeatmapConfig>;
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function ReadingHeatmap({
  data,
  height = CHART_DEFAULT_HEIGHT,
  emptyDescription,
  config,
}: ReadingHeatmapProps) {
  const colors = useMemo(() => getChartColors(), []);
  const dark = isDarkMode();

  if (!data || data.length === 0) {
    return <ChartWrapper empty emptyDescription={emptyDescription ?? '暂无阅读数据'} height={height} />;
  }

  const mergedConfig: HeatmapConfig = {
    data,
    xField: 'hour',
    yField: 'day',
    colorField: 'duration',
    height,
    theme: dark ? 'classicDark' : 'classic',
    type: 'intensity',
    // 5 档离散色阶
    color: {
      type: 'quantize',
      domain: [0, 1],
      range: colors,
    },
    legend: commonLegendStyle.legend,
    tooltip: commonTooltipStyle.tooltip,
    axis: {
      ...commonAxisStyle.axis,
      y: {
        ...commonAxisStyle.axis.y,
        labelFormatter: (d: number) => DAY_LABELS[d] ?? `${d}`,
      },
      x: {
        ...commonAxisStyle.axis.x,
        labelFormatter: (h: number) => `${h}时`,
      },
    },
    interactions: [{ type: 'tooltip' }],
    ...config,
  } as HeatmapConfig;

  return <Heatmap {...mergedConfig} />;
}
