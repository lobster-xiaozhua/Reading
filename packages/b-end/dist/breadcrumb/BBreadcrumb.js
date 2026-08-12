import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P2-5 · Breadcrumb 面包屑导航
 * items[] + separator；可点击项 --color-brand；当前页 --text-primary 不可点击
 * Source: 04 §6.15
 * ============================================================ */
import { forwardRef } from "react";
import { Breadcrumb } from "antd";
/**
 * B 端面包屑
 * - 可点击项用品牌色
 * - 当前页（无 href/onClick）用主文本色，不可点击
 */
export const BBreadcrumb = forwardRef(function BBreadcrumb({ items, ...rest }, ref) {
    const antdItems = items.map((item) => {
        const isLink = Boolean(item.href || item.onClick);
        return {
            title: isLink ? (_jsx("a", { href: item.href, onClick: (e) => {
                    if (item.onClick) {
                        e.preventDefault();
                        item.onClick();
                    }
                }, style: { color: "var(--color-brand)" }, children: item.title })) : (_jsx("span", { style: { color: "var(--color-text-primary)" }, children: item.title })),
        };
    });
    return (_jsx("div", { ref: ref, children: _jsx(Breadcrumb, { items: antdItems, ...rest }) }));
});
//# sourceMappingURL=BBreadcrumb.js.map