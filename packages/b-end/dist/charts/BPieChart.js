import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P7-2 · BPieChart 饼图
 * 基于 @ant-design/charts Pie，封装样式规范 + 空数据 + 暗黑模式
 * 支持环形图（innerRadius）+ 扇区间隔
 * Source: 04 §7.2 / P7-2~6
 * ============================================================ */
import { useMemo } from "react";
import { Pie } from "@ant-design/charts";
import { CHART_DEFAULT_HEIGHT, getChartColors, isDarkMode, commonLegendStyle, commonTooltipStyle, ChartWrapper, } from "./shared";
export function BPieChart({ data, angleField, colorField, ring = true, innerRadius = 0.6, height = CHART_DEFAULT_HEIGHT, showLegend = true, showLabel = true, statisticTitle, emptyDescription, onPointClick, config, }) {
    const colors = useMemo(() => getChartColors(), []);
    const dark = isDarkMode();
    if (!data || data.length === 0) {
        return (_jsx(ChartWrapper, { empty: true, emptyDescription: emptyDescription, height: height }));
    }
    const mergedConfig = {
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
                chart.on("element:click", (e) => {
                    if (e.data?.data)
                        onPointClick(e.data.data);
                });
            }
        },
        ...config,
    };
    return _jsx(Pie, { ...mergedConfig });
}
//# sourceMappingURL=BPieChart.js.map