import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * Checkbox · 02 §1.12
 * 多选 + indeterminate 半选
 * ============================================================ */
import { forwardRef } from "react";
export const Checkbox = forwardRef(function Checkbox({ checked, indeterminate = false, disabled = false, onChange, children, "aria-label": ariaLabel, }, ref) {
    const cls = [
        "novel-checkbox",
        checked ? "is-checked" : "",
        indeterminate ? "is-indeterminate" : "",
        disabled ? "is-disabled" : "",
    ]
        .filter(Boolean)
        .join(" ");
    const toggle = () => {
        if (disabled)
            return;
        onChange?.(!checked);
    };
    return (_jsxs("label", { ref: ref, className: cls, "aria-label": ariaLabel, onClick: (e) => {
            // 防止 label 内嵌 input 的默认行为导致双触发
            if (disabled)
                e.preventDefault();
        }, children: [_jsx("span", { className: "novel-checkbox__box", children: indeterminate ? (_jsx("span", { className: "novel-checkbox__indeterminate", "aria-hidden": true })) : (_jsx("svg", { className: "novel-checkbox__check", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: _jsx("path", { d: "M5 13l4 4L19 7" }) })) }), _jsx("input", { type: "checkbox", className: "novel-checkbox__input", checked: checked, disabled: disabled, "aria-checked": indeterminate ? "mixed" : checked, onChange: toggle }), children != null ? (_jsx("span", { className: "novel-checkbox__label", children: children })) : null] }));
});
//# sourceMappingURL=Checkbox.js.map