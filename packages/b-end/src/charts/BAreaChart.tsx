/* ============================================================
 * P7-2 · BAreaChart 面积图
 * 基于 @ant-design/charts Area，封装样式规范 + 空数据 + 暗黑模式
 * Source: 04 §7.2 / P7-2~6
 * ============================================================ */

import { useMemo } from 'react';
import { Area } from '@ant-design/charts';
import type { AreaConfig } from '@ant-design/charts';
import {
  CHART_DEFAULT_HEIGHT,
  getChartColors,
  isDarkMode,
  commonAxisStyle,
  commonLegendStyle,
  commonTooltipStyle,
  ChartWrapper,
} from './shared';

export interface BAreaChartProps {
  data: Array<Record<string, unknown>>;
  xField: string;
  yField: string;
  seriesField?: string;
  /** 是否堆叠 */
  isStack?: boolean;
  /** 面积透明度（0-1） */
  areaOpacity?: number;
  /** 是否平滑 */
  smooth?: boolean;
  height?: number;
  showLegend?: boolean;
  emptyDescription?: string;
  onPointClick?: (record: Record<string, unknown>) => void;
  config?: Partial<AreaConfig>;
}

export function BAreaChart({
  data,
  xField,
  yField,
  seriesField,
  isStack = true,
  areaOpacity = 0.15,
  smooth = false,
  height = CHART_DEFAULT_HEIGHT,
  showLegend = true,
  emptyDescription,
  onPointClick,
  config,
}: BAreaChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const dark = isDarkMode();

  if (!data || data.length === 0) {
    return <ChartWrapper empty emptyDescription={emptyDescription} height={height} />;
  }

  const mergedConfig: AreaConfig = {
    data,
    xField,
    yField,
    seriesField,
    isStack,
    height,
    theme: dark ? 'classicDark' : 'classic',
    colorField: seriesField,
    color: seriesField ? colors : colors[0],
    style: { fillOpacity: areaOpacity },
    smooth,
    legend: showLegend ? commonLegendStyle.legend : false,
    tooltip: commonTooltipStyle.tooltip,
    axis: commonAxisStyle.axis,
    interactions: [{ type: 'tooltip' }, { type: 'legend-filter' }, { type: 'brush-x' }],
    onReady: (chart) => {
      if (onPointClick) {
        chart.on('element:click', (e: { data?: { data?: Record<string, unknown> } }) => {
          if (e.data?.data) onPointClick(e.data.data);
        });
      }
    },
    ...config,
  } as AreaConfig;

  return <Area {...mergedConfig} />;
}
