import type { DualAxesConfig } from "@ant-design/charts";
export interface WordCountGrowthDatum {
    /** 日期（YYYY-MM-DD） */
    date: string;
    /** 日更字数 */
    dailyWords: number;
    /** 累计字数 */
    totalWords: number;
}
export interface WordCountGrowthChartProps {
    data: WordCountGrowthDatum[];
    /** 日更警戒线（默认 2000） */
    warningThreshold?: number;
    height?: number;
    emptyDescription?: string;
    config?: Partial<DualAxesConfig>;
}
export declare function WordCountGrowthChart({ data, warningThreshold, height, emptyDescription, config, }: WordCountGrowthChartProps): import("react").JSX.Element;
//# sourceMappingURL=WordCountGrowthChart.d.ts.map