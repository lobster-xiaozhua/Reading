import type { ColumnsType } from "antd/es/table";
import type { BTableProps } from "../table/BTable.js";
/** 稿费明细行（与 royalty-api RoyaltyDetail 对齐，组件层独立定义避免循环依赖） */
export interface RoyaltyDetailRow {
    id: string;
    month: string;
    novelTitle: string;
    author: string;
    chapterCount: number;
    wordCount: number;
    contractType: "buyout" | "share" | "guarantee-share";
    rate: number;
    subscriptionRevenue?: number;
    amount: number;
    status: "pending" | "settled" | "withdrawn";
    settledAt?: number;
    withdrawnAt?: number;
}
/** 默认列定义（金额右对齐，P8-2-4） */
export declare function defaultRoyaltyColumns(): ColumnsType<RoyaltyDetailRow>;
export interface BRoyaltyDetailProps {
    /** 自定义列；不传则使用默认列 */
    columns?: BTableProps<RoyaltyDetailRow>["columns"];
    /** 数据源 */
    dataSource?: RoyaltyDetailRow[];
    /** 行 key */
    rowKey?: BTableProps<RoyaltyDetailRow>["rowKey"];
    /** 加载态 */
    loading?: boolean;
    /** 分页 */
    pagination?: BTableProps<RoyaltyDetailRow>["pagination"];
    /** 行选择 */
    rowSelection?: BTableProps<RoyaltyDetailRow>["rowSelection"];
}
/**
 * 稿费明细表组件。
 * 默认列对齐 P8-2-4 规范，金额右对齐千分位，状态色映射 P8-2-3。
 */
export declare function BRoyaltyDetail(props: BRoyaltyDetailProps): import("react").JSX.Element;
//# sourceMappingURL=BRoyaltyDetail.d.ts.map