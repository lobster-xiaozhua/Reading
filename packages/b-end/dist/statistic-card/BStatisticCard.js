import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* ============================================================
 * P2-3 · StatisticCard 统计卡片
 * title + value + prefix/suffix + trend up/down/flat + sparkline + loading + onClick
 * Source: 04 §6.3
 * ============================================================ */
import { forwardRef } from "react";
import { Card, Skeleton, Typography } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, } from "@ant-design/icons";
import { BSparkline } from "./BSparkline";
const { Text } = Typography;
function getTrendColor(trend) {
    switch (trend) {
        case "up":
            return "var(--color-feedback-success)";
        case "down":
            return "var(--color-feedback-error)";
        case "flat":
        default:
            return "var(--color-text-tertiary)";
    }
}
function getTrendIcon(trend) {
    switch (trend) {
        case "up":
            return _jsx(ArrowUpOutlined, {});
        case "down":
            return _jsx(ArrowDownOutlined, {});
        case "flat":
        default:
            return _jsx(MinusOutlined, {});
    }
}
export const BStatisticCard = forwardRef(function BStatisticCard({ title, value, prefix, suffix, trend, trendText, trendLabel, sparkline, loading, onClick, }, ref) {
    return (_jsx(Card, { ref: ref, hoverable: Boolean(onClick), onClick: onClick, className: "b-statistic-card", styles: { body: { padding: "var(--space-5)" } }, children: loading ? (_jsx(Skeleton, { active: true, paragraph: { rows: 2 } })) : (_jsxs(_Fragment, { children: [_jsx(Text, { type: "secondary", style: { fontSize: "var(--font-size-caption, 13px)" }, children: title }), _jsxs("div", { className: "b-statistic-card__value", style: {
                        fontSize: 30,
                        fontWeight: 600,
                        lineHeight: 1.35,
                        marginTop: "var(--space-2)",
                        color: "var(--color-text-primary)",
                    }, children: [prefix && _jsx("span", { style: { marginRight: 4 }, children: prefix }), value, suffix && (_jsx("span", { style: {
                                marginLeft: 4,
                                fontSize: "var(--font-size-body, 14px)",
                            }, children: suffix }))] }), trend && (_jsxs("div", { className: "b-statistic-card__trend", style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-1)",
                        marginTop: "var(--space-2)",
                        fontSize: "var(--font-size-caption, 13px)",
                    }, children: [_jsxs("span", { style: {
                                color: getTrendColor(trend),
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                            }, children: [getTrendIcon(trend), trendText] }), trendLabel && (_jsx(Text, { style: { color: "var(--color-text-tertiary)" }, children: trendLabel }))] })), sparkline && sparkline.length > 0 && (_jsx(BSparkline, { data: sparkline, height: 24, dot: false }))] })) }));
});
//# sourceMappingURL=BStatisticCard.js.map