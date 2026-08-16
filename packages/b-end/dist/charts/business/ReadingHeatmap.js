import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P7-8 · 阅读时长热力图
 * 7×24 网格 / 5 档离散色阶 / 单格 ≥12×12px
 * Source: 02 §4.5 / P7-8
 * ============================================================ */
import { useMemo } from "react";
import { Heatmap } from "@ant-design/charts";
import { CHART_DEFAULT_HEIGHT, getChartColors, isDarkMode, commonAxisStyle, commonLegendStyle, commonTooltipStyle, ChartWrapper, } from "../shared";
const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
export function ReadingHeatmap({ data, height = CHART_DEFAULT_HEIGHT, emptyDescription, config, }) {
    const colors = useMemo(() => getChartColors(), []);
    const dark = isDarkMode();
    if (!data || data.length === 0) {
        return (_jsx(ChartWrapper, { empty: true, emptyDescription: emptyDescription ?? "暂无阅读数据", height: height }));
    }
    const mergedConfig = {
        data,
        xField: "hour",
        yField: "day",
        colorField: "duration",
        height,
        theme: dark ? "classicDark" : "classic",
        // Use the Heatmap component's built-in mark; visual intensity comes from colorField.
        // 5 档离散色阶
        color: {
            type: "quantize",
            domain: [0, 1],
            range: colors,
        },
        legend: commonLegendStyle.legend,
        tooltip: commonTooltipStyle.tooltip,
        axis: {
            ...commonAxisStyle.axis,
            y: {
                ...commonAxisStyle.axis.y,
                labelFormatter: (d) => DAY_LABELS[d] ?? `${d}`,
            },
            x: {
                ...commonAxisStyle.axis.x,
                labelFormatter: (h) => `${h}时`,
            },
        },
        interactions: [{ type: "tooltip" }],
        ...config,
    };
    return _jsx(Heatmap, { ...mergedConfig });
}
//# sourceMappingURL=ReadingHeatmap.js.map