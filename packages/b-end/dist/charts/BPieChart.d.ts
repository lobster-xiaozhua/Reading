import type { PieConfig } from "@ant-design/charts";
export interface BPieChartProps {
    data: Array<Record<string, unknown>>;
    /** 分类字段 */
    angleField: string;
    /** 数值字段 */
    colorField: string;
    /** 是否环形图（默认 true） */
    ring?: boolean;
    /** 环形内半径比例（0-1） */
    innerRadius?: number;
    height?: number;
    showLegend?: boolean;
    /** 是否显示标签 */
    showLabel?: boolean;
    /** 中心文字（环形图） */
    statisticTitle?: string;
    emptyDescription?: string;
    onPointClick?: (record: Record<string, unknown>) => void;
    config?: Partial<PieConfig>;
}
export declare function BPieChart({ data, angleField, colorField, ring, innerRadius, height, showLegend, showLabel, statisticTitle, emptyDescription, onPointClick, config, }: BPieChartProps): import("react").JSX.Element;
//# sourceMappingURL=BPieChart.d.ts.map