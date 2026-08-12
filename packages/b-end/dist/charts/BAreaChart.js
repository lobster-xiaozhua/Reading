import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P7-2 · BAreaChart 面积图
 * 基于 @ant-design/charts Area，封装样式规范 + 空数据 + 暗黑模式
 * Source: 04 §7.2 / P7-2~6
 * ============================================================ */
import { useMemo } from "react";
import { Area } from "@ant-design/charts";
import { CHART_DEFAULT_HEIGHT, getChartColors, isDarkMode, commonAxisStyle, commonLegendStyle, commonTooltipStyle, ChartWrapper, } from "./shared";
export function BAreaChart({ data, xField, yField, seriesField, isStack = true, areaOpacity = 0.15, smooth = false, height = CHART_DEFAULT_HEIGHT, showLegend = true, emptyDescription, onPointClick, config, }) {
    const colors = useMemo(() => getChartColors(), []);
    const dark = isDarkMode();
    if (!data || data.length === 0) {
        return (_jsx(ChartWrapper, { empty: true, emptyDescription: emptyDescription, height: height }));
    }
    const mergedConfig = {
        data,
        xField,
        yField,
        seriesField,
        isStack,
        height,
        theme: dark ? "classicDark" : "classic",
        colorField: seriesField,
        color: seriesField ? colors : colors[0],
        style: { fillOpacity: areaOpacity },
        smooth,
        legend: showLegend ? commonLegendStyle.legend : false,
        tooltip: commonTooltipStyle.tooltip,
        axis: commonAxisStyle.axis,
        interactions: [
            { type: "tooltip" },
            { type: "legend-filter" },
            { type: "brush-x" },
        ],
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
    return _jsx(Area, { ...mergedConfig });
}
//# sourceMappingURL=BAreaChart.js.map