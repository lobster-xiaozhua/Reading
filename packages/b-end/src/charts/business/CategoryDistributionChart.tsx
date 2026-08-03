/* ============================================================
 * P7-11 · 分类占比（环形图）
 * 中心显示总数 / 扇区间隔 2px / Top6 后合并「其他」
 * Source: 02 §4.5 / P7-11
 * ============================================================ */

import { useMemo } from 'react';
import { Pie } from '@ant-design/charts';
import type { PieConfig } from '@ant-design/charts';
import {
  CHART_DEFAULT_HEIGHT,
  getChartColors,
  isDarkMode,
  commonLegendStyle,
  commonTooltipStyle,
  ChartWrapper,
} from '../shared';

export interface CategoryDatum {
  /** 分类名 */
  category: string;
  /** 数量 */
  count: number;
}

export interface CategoryDistributionChartProps {
  data: CategoryDatum[];
  /** 保留前 N 项，其余合并为「其他」（默认 6） */
  topN?: number;
  height?: number;
  emptyDescription?: string;
  config?: Partial<PieConfig>;
}

export function CategoryDistributionChart({
  data,
  topN = 6,
  height = CHART_DEFAULT_HEIGHT,
  emptyDescription,
  config,
}: CategoryDistributionChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const dark = isDarkMode();

  if (!data || data.length === 0) {
    return <ChartWrapper empty emptyDescription={emptyDescription ?? '暂无分类数据'} height={height} />;
  }

  // Top6 后合并「其他」
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, topN);
  const others = sorted.slice(topN);
  const othersTotal = others.reduce((sum, d) => sum + d.count, 0);
  const processed = othersTotal > 0 ? [...top, { category: '其他', count: othersTotal }] : top;
  const total = processed.reduce((sum, d) => sum + d.count, 0);

  const mergedConfig: PieConfig = {
    data: processed,
    angleField: 'count',
    colorField: 'category',
    height,
    theme: dark ? 'classicDark' : 'classic',
    color: colors,
    innerRadius: 0.6,
    legend: commonLegendStyle.legend,
    tooltip: commonTooltipStyle.tooltip,
    label: {
      text: 'percentage',
      style: {
        fontSize: 12,
        fill: 'var(--color-text-secondary)',
      },
    },
    // 中心显示总数
    annotations: [
      {
        type: 'text',
        style: {
          text: `${total.toLocaleString()}`,
          x: '50%',
          y: '46%',
          textAlign: 'center',
          fontSize: 24,
          fontWeight: 600,
          fill: 'var(--color-text-primary)',
        },
      },
      {
        type: 'text',
        style: {
          text: '总数',
          x: '50%',
          y: '58%',
          textAlign: 'center',
          fontSize: 13,
          fill: 'var(--color-text-secondary)',
        },
      },
    ],
    // 扇区间隔 2px
    style: {
      stroke: 'var(--color-bg-container)',
      lineWidth: 2,
    },
    interactions: [{ type: 'tooltip' }, { type: 'legend-filter' }],
    ...config,
  } as PieConfig;

  return <Pie {...mergedConfig} />;
}
