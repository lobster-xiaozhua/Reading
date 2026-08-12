import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * P2-22 · AuthorManager 作者档案与合同管理
 * 作者信息卡 + 作品列表 Table + 合同 Descriptions + 收益 StatisticCard ×3
 * 合同到期前 30 天高亮 --feedback-warning；解约作者作品置灰仍可查
 * Source: 04 §6.22
 * ============================================================ */
import { forwardRef, useMemo } from "react";
import { Card, Descriptions, Tag, Avatar, Table, Tooltip } from "antd";
import { BStatisticCard } from "../statistic-card/BStatisticCard.js";
const CONTRACT_TYPE_LABEL = {
    buyout: "买断",
    share: "分成",
    "guarantee-share": "保底+分成",
};
const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * B 端作者档案与合同管理
 * - 作者信息卡（头像 + 笔名 + 签约状态）
 * - 合同 Descriptions（到期前 30 天高亮 warning）
 * - 收益 StatisticCard ×3（本月/累计/待结算）
 * - 作品列表 Table（解约作者作品置灰仍可查）
 */
export const BAuthorManager = forwardRef(function BAuthorManager({ author, works, contract, royalty }, ref) {
    // 合同到期前 30 天高亮
    const daysToExpire = useMemo(() => {
        return Math.floor((contract.expireTimestamp - Date.now()) / DAY_MS);
    }, [contract.expireTimestamp]);
    const isExpiringSoon = daysToExpire > 0 && daysToExpire <= 30;
    const isTerminated = author.contractStatus === "terminated";
    const workColumns = [
        {
            title: "作品名称",
            dataIndex: "title",
            key: "title",
            render: (title) => (_jsx("span", { style: {
                    color: isTerminated
                        ? "var(--color-text-tertiary)"
                        : "var(--color-text-primary)",
                }, children: title })),
        },
        { title: "分类", dataIndex: "category", key: "category", width: 120 },
        {
            title: "字数",
            dataIndex: "wordCount",
            key: "wordCount",
            width: 120,
            align: "right",
            render: (v) => v.toLocaleString(),
        },
        {
            title: "状态",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status) => {
                const config = {
                    published: { color: "success", text: "已发布" },
                    offline: { color: "error", text: "已下架" },
                    draft: { color: "default", text: "草稿" },
                };
                const c = config[status];
                return _jsx(Tag, { color: c.color, children: c.text });
            },
        },
        {
            title: "更新时间",
            dataIndex: "lastUpdated",
            key: "lastUpdated",
            width: 180,
            render: (v) => new Date(v).toLocaleString("zh-CN"),
        },
    ];
    return (_jsxs("div", { ref: ref, className: "b-author-manager", style: {
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
        }, children: [_jsx(Card, { children: _jsxs("div", { style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-4)",
                    }, children: [_jsx(Avatar, { size: 64, src: author.avatar }), _jsxs("div", { children: [_jsxs("div", { style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "var(--space-2)",
                                    }, children: [_jsx("span", { style: {
                                                fontSize: "var(--font-size-h3, 20px)",
                                                fontWeight: 600,
                                                color: "var(--color-text-primary)",
                                            }, children: author.name }), author.penName !== author.name && (_jsxs("span", { style: { color: "var(--color-text-secondary)" }, children: ["\uFF08\u7B14\u540D\uFF1A", author.penName, "\uFF09"] }))] }), _jsxs("div", { style: {
                                        marginTop: "var(--space-1)",
                                        display: "flex",
                                        gap: "var(--space-3)",
                                        color: "var(--color-text-secondary)",
                                        fontSize: "var(--font-size-body, 14px)",
                                    }, children: [_jsxs("span", { children: ["\u7B7E\u7EA6\u6A21\u5F0F\uFF1A", CONTRACT_TYPE_LABEL[author.contractType]] }), _jsxs("span", { children: ["\u4F5C\u54C1\u6570\uFF1A", author.workCount] }), _jsxs("span", { children: ["\u7D2F\u8BA1\u5B57\u6570\uFF1A", author.totalWords.toLocaleString()] })] })] }), _jsxs("div", { style: { marginLeft: "auto" }, children: [author.contractStatus === "active" && (_jsx(Tag, { color: "success", children: "\u7B7E\u7EA6\u4E2D" })), author.contractStatus === "terminated" && (_jsx(Tag, { color: "default", children: "\u5DF2\u89E3\u7EA6" })), author.contractStatus === "pending" && (_jsx(Tag, { color: "warning", children: "\u5F85\u7B7E\u7EA6" }))] })] }) }), _jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(12, 1fr)",
                    gap: "var(--space-4)",
                }, children: [_jsx("div", { style: { gridColumn: "span 6" }, children: _jsx(Card, { title: "\u5408\u540C\u4FE1\u606F", children: _jsx(Descriptions, { bordered: true, column: 1, size: "small", items: [
                                    {
                                        key: "type",
                                        label: "签约模式",
                                        children: CONTRACT_TYPE_LABEL[contract.type],
                                    },
                                    {
                                        key: "signed",
                                        label: "签约日期",
                                        children: contract.signedAt,
                                    },
                                    {
                                        key: "expire",
                                        label: "到期日期",
                                        children: (_jsx(Tooltip, { title: isExpiringSoon
                                                ? `即将到期（剩 ${daysToExpire} 天）`
                                                : undefined, children: _jsxs("span", { style: {
                                                    color: isExpiringSoon
                                                        ? "var(--color-feedback-warning)"
                                                        : undefined,
                                                    fontWeight: isExpiringSoon ? 600 : undefined,
                                                }, children: [contract.expireAt, isExpiringSoon && ` （剩 ${daysToExpire} 天）`] }) })),
                                    },
                                    { key: "terms", label: "签约条款", children: contract.terms },
                                    {
                                        key: "status",
                                        label: "合同状态",
                                        children: contract.status === "active" ? (_jsx(Tag, { color: "success", children: "\u751F\u6548\u4E2D" })) : contract.status === "expired" ? (_jsx(Tag, { color: "error", children: "\u5DF2\u8FC7\u671F" })) : (_jsx(Tag, { color: "default", children: "\u5DF2\u7EC8\u6B62" })),
                                    },
                                ] }) }) }), _jsx("div", { style: { gridColumn: "span 6" }, children: _jsx(Card, { title: "\u6536\u76CA\u7EDF\u8BA1", children: _jsxs("div", { style: {
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: "var(--space-3)",
                                }, children: [_jsx(BStatisticCard, { title: "\u672C\u6708\u6536\u76CA", value: royalty.monthly, prefix: "\u00A5", trend: "up", trendText: "+8.2%", trendLabel: "\u8F83\u4E0A\u6708" }), _jsx(BStatisticCard, { title: "\u7D2F\u8BA1\u6536\u76CA", value: royalty.total, prefix: "\u00A5" }), _jsx(BStatisticCard, { title: "\u5F85\u7ED3\u7B97", value: royalty.pending, prefix: "\u00A5", trend: royalty.settlementStatus === "pending" ? "flat" : "up", trendText: royalty.settlementStatus === "pending" ? "待结算" : "已结算" })] }) }) })] }), _jsxs(Card, { title: `作品列表（${works.length}）`, children: [_jsx(Table, { columns: workColumns, dataSource: works, rowKey: "id", size: "middle", pagination: {
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (t) => `共 ${t} 条`,
                        }, rowClassName: isTerminated ? "b-author-work--dimmed" : undefined }), isTerminated && (_jsx("style", { children: `
              .b-author-work--dimmed { opacity: 0.6; }
            ` }))] })] }));
});
//# sourceMappingURL=BAuthorManager.js.map