/* ============================================================
 * P7-10 · 排行趋势
 * Y 轴反转（排名 1 顶部）/ 当前作品 chart-1 加粗 2px
 * 同类 Top10 均值 chart-3 虚线 / 上升区间 success 底带
 * Source: 02 §4.5 / P7-10
 * ============================================================ */

import { useMemo } from 'react';
import { Line } from '@ant-design/charts';
import type { LineConfig } from '@ant-design/charts';
import {
  CHART_DEFAULT_HEIGHT,
  getChartColors,
  isDarkMode,
  commonLegendStyle,
  commonTooltipStyle,
  ChartWrapper,
} from '../shared';

export interface RankingTrendDatum {
  /** 日期 */
  date: string;
  /** 排名 */
  rank: number;
  /** 系列名（当前作品 / Top10 均值） */
  series: string;
}

export interface RankingTrendChartProps {
  data: RankingTrendDatum[];
  /** 当前作品系列名（用于加粗） */
  currentSeries?: string;
  height?: number;
  emptyDescription?: string;
  config?: Partial<LineConfig>;
}

export function RankingTrendChart({
  data,
  currentSeries = '当前作品',
  height = CHART_DEFAULT_HEIGHT,
  emptyDescription,
  config,
}: RankingTrendChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const dark = isDarkMode();

  if (!data || data.length === 0) {
    return <ChartWrapper empty emptyDescription={emptyDescription ?? '暂无排行数据'} height={height} />;
  }

  const mergedConfig: LineConfig = {
    data,
    xField: 'date',
    yField: 'rank',
    seriesField: 'series',
    colorField: 'series',
    height,
    theme: dark ? 'classicDark' : 'classic',
    color: colors,
    // Y 轴反转：排名 1 在顶部
    axis: {
      y: {
        title: '排名',
        labelFontSize: 12,
        labelFill: 'var(--color-text-tertiary)',
        gridStroke: 'var(--color-border-subtle)',
        gridLineDash: [2, 2],
        // 反转（G2 通过 domain 反转）
        domain: [10, 1],
      },
      x: {
        labelFontSize: 12,
        labelFill: 'var(--color-text-tertiary)',
        lineStroke: 'var(--color-border-subtle)',
      },
    },
    legend: commonLegendStyle.legend,
    tooltip: commonTooltipStyle.tooltip,
    // 当前作品加粗 + Top10 均值虚线
    style: {
      lineWidth: (datum: { series?: string }) => (datum.series === currentSeries ? 3 : 1.5),
      lineDash: (datum: { series?: string }) =>
        datum.series === currentSeries ? [] : [4, 4],
    },
    interactions: [{ type: 'tooltip' }, { type: 'legend-filter' }, { type: 'brush-x' }],
    ...config,
  } as LineConfig;

  return <Line {...mergedConfig} />;
}
