import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P2-7 · BTable · B 端表格封装
 * 基于 Ant Design Table，设置 B 端默认值（middle 行高、分页、Skeleton 占位）。
 * 仅消费 @novel/tokens 语义令牌（颜色由 B 端全局样式 / ConfigProvider 注入）。
 * Source: 04-B端开发计划.md P2-7
 * ============================================================ */
import { forwardRef, } from "react";
import { Table as AntTable } from "antd";
/**
 * B 端表格。
 *
 * B 端默认：
 * - size='middle'（行高 48px，由 B 端全局样式覆盖 .ant-table-tbody > tr > td）
 * - 分页 { pageSize: 20, showSizeChanger, pageSizeOptions: [10,20,50,100], showTotal }
 * - loading 时用 AntD Skeleton 占位（替换默认 Spin）
 *
 * 操作列约定：透传 columns 时不做改动；建议将「操作」列设置为
 *   fixed: 'right'，width 120-160，以保证横向滚动时操作按钮常驻可见。
 */
const BTableInner = forwardRef(({ size = "middle", loading, pagination, scroll, ...rest }, ref) => {
    return (_jsx(AntTable, { ref: ref, size: size, loading: loading, pagination: pagination === undefined
            ? {
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: (total) => `共 ${total} 条`,
            }
            : pagination, scroll: scroll ?? { x: "max-content" }, ...rest }));
});
BTableInner.displayName = "BTable";
/** 泛型表格组件：保留行数据类型 T，供调用方以 <BTable<T> .../> 精确校验列/数据 */
export const BTable = BTableInner;
//# sourceMappingURL=BTable.js.map