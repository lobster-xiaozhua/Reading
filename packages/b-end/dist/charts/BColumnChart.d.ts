import type { ColumnConfig } from "@ant-design/charts";
export interface BColumnChartProps {
    data: Array<Record<string, unknown>>;
    xField: string;
    yField: string;
    seriesField?: string;
    /** 是否分组（多系列时） */
    isGroup?: boolean;
    /** 是否堆叠 */
    isStack?: boolean;
    height?: number;
    showLegend?: boolean;
    emptyDescription?: string;
    onPointClick?: (record: Record<string, unknown>) => void;
    config?: Partial<ColumnConfig>;
}
export declare function BColumnChart({ data, xField, yField, seriesField, isGroup, isStack, height, showLegend, emptyDescription, onPointClick, config, }: BColumnChartProps): import("react").JSX.Element;
//# sourceMappingURL=BColumnChart.d.ts.map