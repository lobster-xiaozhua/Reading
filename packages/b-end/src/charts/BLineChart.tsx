/* ============================================================
 * P7-2 · BLineChart 折线图
 * 基于 @ant-design/charts Line，封装样式规范 + 空数据 + 暗黑模式
 * Source: 04 §7.2 / P7-2~6
 * ============================================================ */

import { useMemo } from 'react';
import { Line } from '@ant-design/charts';
import type { LineConfig } from '@ant-design/charts';
import {
  CHART_DEFAULT_HEIGHT,
  getChartColors,
  isDarkMode,
  commonAxisStyle,
  commonLegendStyle,
  commonTooltipStyle,
  ChartWrapper,
} from './shared';

export interface BLineChartProps {
  /** 数据源 */
  data: Array<Record<string, unknown>>;
  /** X 轴字段 */
  xField: string;
  /** Y 轴字段 */
  yField: string;
  /** 分组字段（多系列） */
  seriesField?: string;
  /** 高度（默认 320） */
  height?: number;
  /** 是否平滑 */
  smooth?: boolean;
  /** 是否显示图例 */
  showLegend?: boolean;
  /** 空数据描述 */
  emptyDescription?: string;
  /** 点击钻取回调（P7-4） */
  onPointClick?: (record: Record<string, unknown>) => void;
  /** 额外配置（覆盖默认） */
  config?: Partial<LineConfig>;
}

export function BLineChart({
  data,
  xField,
  yField,
  seriesField,
  height = CHART_DEFAULT_HEIGHT,
  smooth = false,
  showLegend = true,
  emptyDescription,
  onPointClick,
  config,
}: BLineChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const dark = isDarkMode();

  if (!data || data.length === 0) {
    return <ChartWrapper empty emptyDescription={emptyDescription} height={height} />;
  }

  const mergedConfig: LineConfig = {
    data,
    xField,
    yField,
    seriesField,
    height,
    theme: dark ? 'classicDark' : 'classic',
    colorField: seriesField,
    color: seriesField ? colors : colors[0],
    smooth,
    legend: showLegend ? commonLegendStyle.legend : false,
    tooltip: commonTooltipStyle.tooltip,
    axis: commonAxisStyle.axis,
    interactions: [
      { type: 'tooltip' },
      { type: 'legend-filter' },
      // X 轴拖拽缩放（P7-4）
      { type: 'brush-x' },
    ],
    onReady: (chart) => {
      if (onPointClick) {
        chart.on('element:click', (e: { data?: { data?: Record<string, unknown> } }) => {
          if (e.data?.data) onPointClick(e.data.data);
        });
      }
    },
    ...config,
  } as LineConfig;

  return <Line {...mergedConfig} />;
}
