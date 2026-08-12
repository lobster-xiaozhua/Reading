import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * Switch · 02 §1.11
 * 二元开关；2 尺寸；brand 开启色
 * ============================================================ */
import { forwardRef } from "react";
export const Switch = forwardRef(function Switch({ checked, disabled = false, size = "md", onChange, "aria-label": ariaLabel, }, ref) {
    const cls = [
        "novel-switch",
        `novel-switch--${size}`,
        checked ? "is-checked" : "",
        disabled ? "is-disabled" : "",
    ]
        .filter(Boolean)
        .join(" ");
    return (_jsx("button", { ref: ref, type: "button", role: "switch", "aria-checked": checked, "aria-label": ariaLabel, className: cls, disabled: disabled, onClick: () => !disabled && onChange?.(!checked), children: _jsx("span", { className: "novel-switch__thumb", "aria-hidden": true }) }));
});
//# sourceMappingURL=Switch.js.map