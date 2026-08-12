import type { LineConfig } from "@ant-design/charts";
export interface BLineChartProps {
    /** 数据源 */
    data: Array<Record<string, unknown>>;
    /** X 轴字段 */
    xField: string;
    /** Y 轴字段 */
    yField: string;
    /** 分组字段（多系列） */
    seriesField?: string;
    /** 高度（默认 320） */
    height?: number;
    /** 是否平滑 */
    smooth?: boolean;
    /** 是否显示图例 */
    showLegend?: boolean;
    /** 空数据描述 */
    emptyDescription?: string;
    /** 点击钻取回调（P7-4） */
    onPointClick?: (record: Record<string, unknown>) => void;
    /** 额外配置（覆盖默认） */
    config?: Partial<LineConfig>;
}
export declare function BLineChart({ data, xField, yField, seriesField, height, smooth, showLegend, emptyDescription, onPointClick, config, }: BLineChartProps): import("react").JSX.Element;
//# sourceMappingURL=BLineChart.d.ts.map