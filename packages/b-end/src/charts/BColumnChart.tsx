/* ============================================================
 * P7-2 · BColumnChart 柱状图
 * 基于 @ant-design/charts Column，封装样式规范 + 空数据 + 暗黑模式
 * Source: 04 §7.2 / P7-2~6
 * ============================================================ */

import { useMemo } from "react";
import { Column } from "@ant-design/charts";
import type { ColumnConfig } from "@ant-design/charts";
import {
  CHART_DEFAULT_HEIGHT,
  getChartColors,
  isDarkMode,
  commonAxisStyle,
  commonLegendStyle,
  commonTooltipStyle,
  ChartWrapper,
} from "./shared";

export interface BColumnChartProps {
  data: Array<Record<string, unknown>>;
  xField: string;
  yField: string;
  seriesField?: string;
  /** 是否分组（多系列时） */
  isGroup?: boolean;
  /** 是否堆叠 */
  isStack?: boolean;
  height?: number;
  showLegend?: boolean;
  emptyDescription?: string;
  onPointClick?: (record: Record<string, unknown>) => void;
  config?: Partial<ColumnConfig>;
}

export function BColumnChart({
  data,
  xField,
  yField,
  seriesField,
  isGroup = true,
  isStack = false,
  height = CHART_DEFAULT_HEIGHT,
  showLegend = true,
  emptyDescription,
  onPointClick,
  config,
}: BColumnChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const dark = isDarkMode();

  if (!data || data.length === 0) {
    return (
      <ChartWrapper empty emptyDescription={emptyDescription} height={height} />
    );
  }

  const mergedConfig: ColumnConfig = {
    data,
    xField,
    yField,
    seriesField,
    isGroup: seriesField ? isGroup : false,
    isStack,
    height,
    theme: dark ? "classicDark" : "classic",
    colorField: seriesField,
    color: seriesField ? colors : colors[0],
    legend: showLegend ? commonLegendStyle.legend : false,
    tooltip: commonTooltipStyle.tooltip,
    axis: commonAxisStyle.axis,
    interactions: [{ type: "tooltip" }, { type: "legend-filter" }],
    onReady: (chart) => {
      if (onPointClick) {
        chart.on(
          "element:click",
          (e: { data?: { data?: Record<string, unknown> } }) => {
            if (e.data?.data) onPointClick(e.data.data);
          },
        );
      }
    },
    ...config,
  } as ColumnConfig;

  return <Column {...mergedConfig} />;
}
