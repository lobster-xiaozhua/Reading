import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * Tag · 02 §1.7
 * 5 语义色；可选关闭
 * ============================================================ */
import { forwardRef } from "react";
export const Tag = forwardRef(function Tag({ color = "default", closable = false, onClose, className, children, ...rest }, ref) {
    const cls = ["novel-tag", `novel-tag--${color}`, className ?? ""]
        .filter(Boolean)
        .join(" ");
    return (_jsxs("span", { ref: ref, className: cls, ...rest, children: [children, closable ? (_jsx("svg", { className: "novel-tag__close", viewBox: "0 0 24 24", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", "aria-label": "\u5173\u95ED", role: "button", tabIndex: 0, onClick: onClose, onKeyDown: (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClose?.(e);
                    }
                }, children: _jsx("path", { d: "M6 6l12 12M18 6L6 18" }) })) : null] }));
});
//# sourceMappingURL=Tag.js.map