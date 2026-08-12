import type { HeatmapConfig } from "@ant-design/charts";
export interface ReadingHeatmapDatum {
    /** 0-6（周一到周日） */
    day: number;
    /** 0-23（小时） */
    hour: number;
    /** 阅读时长（分钟） */
    duration: number;
}
export interface ReadingHeatmapProps {
    data: ReadingHeatmapDatum[];
    height?: number;
    emptyDescription?: string;
    config?: Partial<HeatmapConfig>;
}
export declare function ReadingHeatmap({ data, height, emptyDescription, config, }: ReadingHeatmapProps): import("react").JSX.Element;
//# sourceMappingURL=ReadingHeatmap.d.ts.map