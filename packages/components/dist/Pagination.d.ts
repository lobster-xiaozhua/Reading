export interface PaginationProps {
    /** 当前页（1-based） */
    current: number;
    /** 总页数 */
    total: number;
    /** 折叠时两端保留的页数 */
    siblings?: number;
    /** 显示快速跳转输入框 */
    showJumper?: boolean;
    /** 显示总数文本 */
    showTotal?: boolean;
    /** 总条目数（仅用于 showTotal 文案） */
    totalItems?: number;
    onChange?: (page: number) => void;
}
export declare function Pagination({ current, total, siblings, showJumper, showTotal, totalItems, onChange, }: PaginationProps): import("react").JSX.Element;
//# sourceMappingURL=Pagination.d.ts.map