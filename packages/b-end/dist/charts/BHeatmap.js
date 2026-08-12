import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P7-2 · BHeatmap 热力图
 * 基于 @ant-design/charts Heatmap，封装样式规范 + 空数据 + 暗黑模式
 * 用于 P7-8 阅读时长热力图（7×24 网格）
 * Source: 04 §7.2 / P7-2~6
 * ============================================================ */
import { useMemo } from "react";
import { Heatmap } from "@ant-design/charts";
import { CHART_DEFAULT_HEIGHT, getChartColors, isDarkMode, commonAxisStyle, commonLegendStyle, commonTooltipStyle, ChartWrapper, } from "./shared";
export function BHeatmap({ data, xField, yField, colorField, height = CHART_DEFAULT_HEIGHT, type = "intensity", showLegend = true, emptyDescription, config, }) {
    const colors = useMemo(() => getChartColors(), []);
    const dark = isDarkMode();
    if (!data || data.length === 0) {
        return (_jsx(ChartWrapper, { empty: true, emptyDescription: emptyDescription, height: height }));
    }
    const mergedConfig = {
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
    };
    return _jsx(Heatmap, { ...mergedConfig });
}
//# sourceMappingURL=BHeatmap.js.map