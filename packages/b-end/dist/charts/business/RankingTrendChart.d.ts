import type { LineConfig } from "@ant-design/charts";
export interface RankingTrendDatum {
    /** 日期 */
    date: string;
    /** 排名 */
    rank: number;
    /** 系列名（当前作品 / Top10 均值） */
    series: string;
}
export interface RankingTrendChartProps {
    data: RankingTrendDatum[];
    /** 当前作品系列名（用于加粗） */
    currentSeries?: string;
    height?: number;
    emptyDescription?: string;
    config?: Partial<LineConfig>;
}
export declare function RankingTrendChart({ data, currentSeries, height, emptyDescription, config, }: RankingTrendChartProps): import("react").JSX.Element;
//# sourceMappingURL=RankingTrendChart.d.ts.map