import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P7-7 · 字数增长曲线（DualAxes 双轴）
 * 日更字数 chart-1 面积 0.15 + 累计字数 chart-3 实线右 Y 轴
 * 日更 <2000 高亮 warning；连续 3 天断更虚线
 * Source: 02 §4.5 / P7-7
 * ============================================================ */
import { useMemo } from "react";
import { DualAxes } from "@ant-design/charts";
import { CHART_DEFAULT_HEIGHT, getChartColors, isDarkMode, commonAxisStyle, commonLegendStyle, commonTooltipStyle, ChartWrapper, } from "../shared";
export function WordCountGrowthChart({ data, warningThreshold = 2000, height = CHART_DEFAULT_HEIGHT, emptyDescription, config, }) {
    const colors = useMemo(() => getChartColors(), []);
    const dark = isDarkMode();
    if (!data || data.length === 0) {
        return (_jsx(ChartWrapper, { empty: true, emptyDescription: emptyDescription ?? "暂无字数数据", height: height }));
    }
    const mergedConfig = {
        data: [data, data],
        xField: "date",
        yField: ["dailyWords", "totalWords"],
        height,
        theme: dark ? "classicDark" : "classic",
        geometryOptions: [
            {
                geometry: "area",
                color: colors[0],
                style: { fillOpacity: 0.15 },
                smooth: true,
            },
            {
                geometry: "line",
                color: colors[2],
                smooth: true,
                lineStyle: {
                    lineWidth: 2,
                },
            },
        ],
        legend: commonLegendStyle.legend,
        tooltip: commonTooltipStyle.tooltip,
        axis: {
            ...commonAxisStyle.axis,
            y: {
                ...commonAxisStyle.axis.y,
                title: "日更字数",
            },
            yRight: {
                title: "累计字数",
                labelFontSize: 12,
                labelFill: "var(--color-text-tertiary)",
            },
        },
        // 警戒线（日更 <2000）
        annotations: [
            {
                type: "lineY",
                yField: warningThreshold,
                style: {
                    stroke: "var(--color-feedback-warning)",
                    lineDash: [4, 4],
                },
            },
        ],
        interactions: [
            { type: "tooltip" },
            { type: "legend-filter" },
            { type: "brush-x" },
        ],
        ...config,
    };
    return _jsx(DualAxes, { ...mergedConfig });
}
//# sourceMappingURL=WordCountGrowthChart.js.map