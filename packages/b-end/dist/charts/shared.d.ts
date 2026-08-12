import type { CSSProperties } from "react";
/** 图表默认高度（04 §7.2） */
export declare const CHART_DEFAULT_HEIGHT = 320;
/** 图表容器默认样式 */
export declare const CHART_CONTAINER_STYLE: CSSProperties;
/**
 * 从 CSS 变量读取图表色板（运行时）
 * 用于将 `var(--color-chart-1)` 解析为实际色值传给 @ant-design/charts
 */
export declare function getChartColors(): string[];
/** 检测当前是否暗黑模式（data-theme='dark'） */
export declare function isDarkMode(): boolean;
/** 通用坐标轴样式（04 §7.2） */
export declare const commonAxisStyle: {
    readonly axis: {
        readonly x: {
            readonly labelFontSize: 12;
            readonly labelFill: "var(--color-text-tertiary)";
            readonly lineStroke: "var(--color-border-subtle)";
        };
        readonly y: {
            readonly labelFontSize: 12;
            readonly labelFill: "var(--color-text-tertiary)";
            readonly gridStroke: "var(--color-border-subtle)";
            readonly gridLineDash: readonly [2, 2];
        };
    };
};
/** 通用图例样式（04 §7.2） */
export declare const commonLegendStyle: {
    readonly legend: {
        readonly color: {
            readonly itemLabelFontSize: 13;
            readonly itemLabelFill: "var(--color-text-secondary)";
            readonly itemMarkerSize: 10;
        };
    };
};
/** 通用 Tooltip 样式（04 §7.2） */
export declare const commonTooltipStyle: {
    readonly tooltip: {
        readonly style: {
            readonly fontSize: 13;
            readonly background: "var(--color-bg-elevated)";
            readonly color: "var(--color-text-inverse)";
            readonly boxShadow: "var(--sh-2)";
            readonly borderRadius: "var(--radius-md, 8px)";
            readonly padding: "8px 12px";
        };
    };
};
/** 空数据占位（P7-5） */
export declare function renderChartEmpty(description?: string): React.ReactNode;
/** 图表容器包装：处理空数据 + 加载态 */
export interface ChartWrapperProps {
    /** 是否为空数据 */
    empty?: boolean;
    /** 空数据描述 */
    emptyDescription?: string;
    /** 高度（默认 320） */
    height?: number;
    /** 子节点（空数据时可不传） */
    children?: React.ReactNode;
}
export declare function ChartWrapper({ empty, emptyDescription, height, children, }: ChartWrapperProps): import("react").JSX.Element;
//# sourceMappingURL=shared.d.ts.map