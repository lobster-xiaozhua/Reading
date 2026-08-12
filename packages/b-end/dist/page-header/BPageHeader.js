import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * P2-1 · PageHeader 页面标题
 * title H2 28px semibold + breadcrumb + extra + tags + onBack
 * AntD PageHeader 已废弃，用 Typography.Title + Breadcrumb + Space 组合实现
 * Source: 04 §6.4
 * ============================================================ */
import { forwardRef } from "react";
import { Typography, Space, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { BBreadcrumb } from "../breadcrumb/BBreadcrumb.js";
const { Title } = Typography;
/**
 * B 端页面标题
 * - title 用 H2 (28px semibold)
 * - 可选面包屑、标签、操作按钮、返回
 */
export const BPageHeader = forwardRef(function BPageHeader({ title, breadcrumb, tags, extra, subTitle, onBack, backText = "返回" }, ref) {
    return (_jsxs("div", { ref: ref, className: "b-page-header", style: { marginBottom: "var(--space-5)" }, children: [breadcrumb && breadcrumb.length > 0 && (_jsx(BBreadcrumb, { items: breadcrumb, style: { marginBottom: "var(--space-2)" } })), _jsxs("div", { className: "b-page-header__main", style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                }, children: [onBack && (_jsx(Button, { type: "text", icon: _jsx(ArrowLeftOutlined, {}), onClick: onBack, "aria-label": backText, children: backText })), _jsx(Title, { level: 2, style: {
                            margin: 0,
                            fontSize: "var(--font-size-h2, 28px)",
                            fontWeight: 600,
                        }, children: title }), tags && _jsx(Space, { size: "small", children: tags }), subTitle && (_jsx("span", { style: {
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--font-size-body, 14px)",
                        }, children: subTitle })), extra && (_jsx("div", { className: "b-page-header__extra", style: { marginLeft: "auto" }, children: extra }))] })] }));
});
//# sourceMappingURL=BPageHeader.js.map