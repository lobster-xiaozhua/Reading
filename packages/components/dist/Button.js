import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * Button · 02 §1.1
 * 5 变体 × 3 尺寸；令牌消费；focus-visible + loading
 * ============================================================ */
import { forwardRef } from "react";
export const Button = forwardRef(function Button({ variant = "primary", size = "md", disabled = false, loading = false, icon, type = "button", className, children, ...rest }, ref) {
    const isDisabled = disabled || loading;
    const cls = [
        "novel-btn",
        `novel-btn--${variant}`,
        `novel-btn--${size}`,
        loading ? "is-loading" : "",
        isDisabled ? "is-disabled" : "",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    return (_jsxs("button", { ref: ref, type: type, className: cls, disabled: isDisabled, "aria-busy": loading, ...rest, children: [loading ? _jsx("span", { className: "novel-btn__spin", "aria-hidden": true }) : icon, children] }));
});
//# sourceMappingURL=Button.js.map