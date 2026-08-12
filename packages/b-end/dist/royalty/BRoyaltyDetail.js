import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * P8-2-4 · 稿费明细表 BRoyaltyDetail
 * 列：月份 / 小说 / 章节数 / 字数 / 单价或分成 / 金额 / 状态
 * 金额右对齐千分位；状态色：pending warning / settled processing / withdrawn success
 * Source: 04 §13.2 / P8-2-4
 * ============================================================ */
import { Tag } from "antd";
import { BTable } from "../table/BTable.js";
import { getContractTypeName } from "../data-model/vip-pricing.js";
/** 金额千分位格式化 */
function formatAmount(n) {
    return n.toLocaleString("zh-CN");
}
/** 状态标签配置（P8-2-3） */
const STATUS_TAG = {
    pending: { text: "待结算", color: "warning" },
    settled: { text: "已结算", color: "processing" },
    withdrawn: { text: "已提现", color: "success" },
};
/** 默认列定义（金额右对齐，P8-2-4） */
export function defaultRoyaltyColumns() {
    return [
        {
            title: "月份",
            dataIndex: "month",
            key: "month",
            width: 110,
            fixed: "left",
        },
        {
            title: "小说",
            dataIndex: "novelTitle",
            key: "novelTitle",
            width: 160,
            render: (text, row) => (_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 500 }, children: text }), _jsx("div", { style: { fontSize: 12, color: "var(--color-text-tertiary)" }, children: row.author })] })),
        },
        {
            title: "章节数",
            dataIndex: "chapterCount",
            key: "chapterCount",
            width: 90,
            align: "right",
            sorter: (a, b) => a.chapterCount - b.chapterCount,
        },
        {
            title: "字数（含标点）",
            dataIndex: "wordCount",
            key: "wordCount",
            width: 130,
            align: "right",
            sorter: (a, b) => a.wordCount - b.wordCount,
            render: (v) => formatAmount(v),
        },
        {
            title: "签约模式",
            dataIndex: "contractType",
            key: "contractType",
            width: 110,
            render: (t, row) => {
                const label = getContractTypeName(t);
                const rateText = t === "buyout"
                    ? `${row.rate} 书币/千字`
                    : t === "share"
                        ? `分成 ${(row.rate * 100).toFixed(0)}%`
                        : `保底 ${formatAmount(row.rate)} + 分成`;
                return (_jsxs("div", { children: [_jsx("div", { children: label }), _jsx("div", { style: { fontSize: 12, color: "var(--color-text-tertiary)" }, children: rateText })] }));
            },
        },
        {
            title: "应发金额",
            dataIndex: "amount",
            key: "amount",
            width: 130,
            align: "right",
            sorter: (a, b) => a.amount - b.amount,
            render: (v) => (_jsx("span", { style: {
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-text-primary)",
                }, children: formatAmount(v) })),
        },
        {
            title: "状态",
            dataIndex: "status",
            key: "status",
            width: 100,
            fixed: "right",
            render: (s) => {
                const cfg = STATUS_TAG[s];
                return _jsx(Tag, { color: cfg.color, children: cfg.text });
            },
        },
    ];
}
/**
 * 稿费明细表组件。
 * 默认列对齐 P8-2-4 规范，金额右对齐千分位，状态色映射 P8-2-3。
 */
export function BRoyaltyDetail(props) {
    const { columns, dataSource, rowKey, loading, pagination, rowSelection } = props;
    return (_jsx(BTable, { columns: columns ?? defaultRoyaltyColumns(), dataSource: dataSource, rowKey: rowKey, loading: loading, pagination: pagination, rowSelection: rowSelection }));
}
//# sourceMappingURL=BRoyaltyDetail.js.map