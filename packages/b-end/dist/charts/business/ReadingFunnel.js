import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P7-9 · 追更漏斗
 * 发现→详情→加书架→开读→追更转化 5 层等高
 * 宽度按转化率缩放 / 转化率 <10% warning 标注
 * Source: 02 §4.5 / P7-9
 * ============================================================ */
import { useMemo } from "react";
import { Funnel } from "@ant-design/charts";
import { CHART_DEFAULT_HEIGHT, getChartColors, isDarkMode, commonLegendStyle, commonTooltipStyle, ChartWrapper, } from "../shared";
export function ReadingFunnel({ data, height = CHART_DEFAULT_HEIGHT, emptyDescription, config, }) {
    const colors = useMemo(() => getChartColors(), []);
    const dark = isDarkMode();
    if (!data || data.length === 0) {
        return (_jsx(ChartWrapper, { empty: true, emptyDescription: emptyDescription ?? "暂无漏斗数据", height: height }));
    }
    const mergedConfig = {
        data,
        xField: "stage",
        yField: "value",
        height,
        theme: dark ? "classicDark" : "classic",
        color: colors,
        isTransposed: true,
        legend: commonLegendStyle.legend,
        tooltip: commonTooltipStyle.tooltip,
        label: {
            text: (datum) => {
                const total = data[0]?.value ?? 1;
                const rate = (((datum.value ?? 0) / total) * 100).toFixed(1);
                const isLow = Number(rate) < 10;
                return `${datum.value} (${rate}%)${isLow ? " ⚠" : ""}`;
            },
            style: {
                fontSize: 12,
                fill: "var(--color-text-secondary)",
            },
        },
        interactions: [{ type: "tooltip" }],
        ...config,
    };
    return _jsx(Funnel, { ...mergedConfig });
}
//# sourceMappingURL=ReadingFunnel.js.map