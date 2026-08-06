/* ============================================================
 * P7-2 · BPieChart 饼图
 * 基于 @ant-design/charts Pie，封装样式规范 + 空数据 + 暗黑模式
 * 支持环形图（innerRadius）+ 扇区间隔
 * Source: 04 §7.2 / P7-2~6
 * ============================================================ */

import { useMemo } from "react";
import { Pie } from "@ant-design/charts";
import type { PieConfig } from "@ant-design/charts";
import {
  CHART_DEFAULT_HEIGHT,
  getChartColors,
  isDarkMode,
  commonLegendStyle,
  commonTooltipStyle,
  ChartWrapper,
} from "./shared";

export interface BPieChartProps {
  data: Array<Record<string, unknown>>;
  /** 分类字段 */
  angleField: string;
  /** 数值字段 */
  colorField: string;
  /** 是否环形图（默认 true） */
  ring?: boolean;
  /** 环形内半径比例（0-1） */
  innerRadius?: number;
  height?: number;
  showLegend?: boolean;
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 中心文字（环形图） */
  statisticTitle?: string;
  emptyDescription?: string;
  onPointClick?: (record: Record<string, unknown>) => void;
  config?: Partial<PieConfig>;
}

export function BPieChart({
  data,
  angleField,
  colorField,
  ring = true,
  innerRadius = 0.6,
  height = CHART_DEFAULT_HEIGHT,
  showLegend = true,
  showLabel = true,
  statisticTitle,
  emptyDescription,
  onPointClick,
  config,
}: BPieChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const dark = isDarkMode();

  if (!data || data.length === 0) {
    return (
      <ChartWrapper empty emptyDescription={emptyDescription} height={height} />
    );
  }

  const mergedConfig: PieConfig = {
    data,
    angleField,
    colorField,
    height,
    theme: dark ? "classicDark" : "classic",
    color: colors,
    innerRadius: ring ? innerRadius : 0,
    legend: showLegend ? commonLegendStyle.legend : false,
    tooltip: commonTooltipStyle.tooltip,
    label: showLabel
      ? {
          text: "percentage",
          style: {
            fontSize: 12,
            fill: "var(--color-text-secondary)",
          },
        }
      : false,
    // 环形图中心统计（P7-11 分类占比中心显示总数）
    ...(ring && statisticTitle
      ? {
          annotations: [
            {
              type: "text",
              style: {
                text: statisticTitle,
                x: "50%",
                y: "50%",
                textAlign: "center",
                fontSize: 14,
                fill: "var(--color-text-secondary)",
              },
            },
          ],
        }
      : {}),
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
  } as PieConfig;

  return <Pie {...mergedConfig} />;
}
