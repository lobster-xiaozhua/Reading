import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Badge({ count, overflow = 99, dot = false, children, }) {
    let label = null;
    if (!dot && count != null) {
        label = count > overflow ? `${overflow}+` : String(count);
    }
    return (_jsxs("span", { className: "novel-badge", children: [children, dot ? (_jsx("span", { className: "novel-badge__dot", "aria-label": "\u6709\u65B0\u5185\u5BB9" })) : label != null ? (_jsx("span", { className: "novel-badge__count", "aria-label": `${label} 条未读`, children: label })) : null] }));
}
//# sourceMappingURL=Badge.js.map