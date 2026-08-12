import type { AreaConfig } from "@ant-design/charts";
export interface BAreaChartProps {
    data: Array<Record<string, unknown>>;
    xField: string;
    yField: string;
    seriesField?: string;
    /** 是否堆叠 */
    isStack?: boolean;
    /** 面积透明度（0-1） */
    areaOpacity?: number;
    /** 是否平滑 */
    smooth?: boolean;
    height?: number;
    showLegend?: boolean;
    emptyDescription?: string;
    onPointClick?: (record: Record<string, unknown>) => void;
    config?: Partial<AreaConfig>;
}
export declare function BAreaChart({ data, xField, yField, seriesField, isStack, areaOpacity, smooth, height, showLegend, emptyDescription, onPointClick, config, }: BAreaChartProps): import("react").JSX.Element;
//# sourceMappingURL=BAreaChart.d.ts.map