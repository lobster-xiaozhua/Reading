import type { PieConfig } from "@ant-design/charts";
export interface CategoryDatum {
    /** 分类名 */
    category: string;
    /** 数量 */
    count: number;
}
export interface CategoryDistributionChartProps {
    data: CategoryDatum[];
    /** 保留前 N 项，其余合并为「其他」（默认 6） */
    topN?: number;
    height?: number;
    emptyDescription?: string;
    config?: Partial<PieConfig>;
}
export declare function CategoryDistributionChart({ data, topN, height, emptyDescription, config, }: CategoryDistributionChartProps): import("react").JSX.Element;
//# sourceMappingURL=CategoryDistributionChart.d.ts.map