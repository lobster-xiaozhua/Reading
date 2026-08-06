/* ============================================================
 * P7-2 · BGauge 仪表盘
 * 基于 @ant-design/charts Gauge，封装样式规范 + 空数据 + 暗黑模式
 * 用于完读率、目标达成率等单值指标
 * Source: 04 §7.2 / P7-2~6
 * ============================================================ */

import { useMemo } from "react";
import { Gauge } from "@ant-design/charts";
import type { GaugeConfig } from "@ant-design/charts";
import {
  CHART_DEFAULT_HEIGHT,
  getChartColors,
  isDarkMode,
  ChartWrapper,
} from "./shared";

export interface BGaugeProps {
  /** 当前值（0-1） */
  value: number;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 中心标题 */
  title?: string;
  height?: number;
  emptyDescription?: string;
  config?: Partial<GaugeConfig>;
}

export function BGauge({
  value,
  min = 0,
  max = 1,
  title,
  height = CHART_DEFAULT_HEIGHT,
  emptyDescription,
  config,
}: BGaugeProps) {
  const colors = useMemo(() => getChartColors(), []);
  const dark = isDarkMode();

  if (value == null || Number.isNaN(value)) {
    return (
      <ChartWrapper empty emptyDescription={emptyDescription} height={height} />
    );
  }

  const mergedConfig: GaugeConfig = {
    value: Math.max(min, Math.min(max, value)),
    min,
    max,
    height,
    theme: dark ? "classicDark" : "classic",
    color: colors[0],
    legend: false,
    annotations: title
      ? [
          {
            type: "text",
            style: {
              text: title,
              x: "50%",
              y: "60%",
              textAlign: "center",
              fontSize: 14,
              fill: "var(--color-text-secondary)",
            },
          },
        ]
      : [],
    ...config,
  } as GaugeConfig;

  return <Gauge {...mergedConfig} />;
}
