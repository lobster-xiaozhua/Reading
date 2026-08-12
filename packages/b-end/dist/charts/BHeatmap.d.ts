import type { HeatmapConfig } from "@ant-design/charts";
export interface BHeatmapProps {
    data: Array<Record<string, unknown>>;
    /** X 轴字段（如 hour） */
    xField: string;
    /** Y 轴字段（如 day） */
    yField: string;
    /** 数值字段（如 count） */
    colorField: string;
    height?: number;
    /** 色阶类型 */
    type?: "intensity" | "size";
    showLegend?: boolean;
    emptyDescription?: string;
    config?: Partial<HeatmapConfig>;
}
export declare function BHeatmap({ data, xField, yField, colorField, height, type, showLegend, emptyDescription, config, }: BHeatmapProps): import("react").JSX.Element;
//# sourceMappingURL=BHeatmap.d.ts.map