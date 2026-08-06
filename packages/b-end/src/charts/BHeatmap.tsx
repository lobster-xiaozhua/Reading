/* ============================================================
 * P7-2 · BHeatmap 热力图
 * 基于 @ant-design/charts Heatmap，封装样式规范 + 空数据 + 暗黑模式
 * 用于 P7-8 阅读时长热力图（7×24 网格）
 * Source: 04 §7.2 / P7-2~6
 * ============================================================ */

import { useMemo } from "react";
import { Heatmap } from "@ant-design/charts";
import type { HeatmapConfig } from "@ant-design/charts";
import {
  CHART_DEFAULT_HEIGHT,
  getChartColors,
  isDarkMode,
  commonAxisStyle,
  commonLegendStyle,
  commonTooltipStyle,
  ChartWrapper,
} from "./shared";

export interface BHeatmapProps {
  data: Array<Record<string, unknown>>;
  /** X 轴字段（如 hour） */
  xField: string;
  /** Y 轴字段（如 day） */
  yField: string;
  /** 数值字段（如 count） */
  colorField: string;
  height?: number;
  /** 色阶类型 */
  type?: "intensity" | "size";
  showLegend?: boolean;
  emptyDescription?: string;
  config?: Partial<HeatmapConfig>;
}

export function BHeatmap({
  data,
  xField,
  yField,
  colorField,
  height = CHART_DEFAULT_HEIGHT,
  type = "intensity",
  showLegend = true,
  emptyDescription,
  config,
}: BHeatmapProps) {
  const colors = useMemo(() => getChartColors(), []);
  const dark = isDarkMode();

  if (!data || data.length === 0) {
    return (
      <ChartWrapper empty emptyDescription={emptyDescription} height={height} />
    );
  }

  const mergedConfig: HeatmapConfig = {
    data,
    xField,
    yField,
    colorField,
    height,
    theme: dark ? "classicDark" : "classic",
    type,
    color: colors,
    legend: showLegend ? commonLegendStyle.legend : false,
    tooltip: commonTooltipStyle.tooltip,
    axis: commonAxisStyle.axis,
    interactions: [{ type: "tooltip" }],
    ...config,
  } as HeatmapConfig;

  return <Heatmap {...mergedConfig} />;
}
