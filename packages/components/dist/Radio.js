import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * Radio · 02 §1.12
 * Radio.Group 单选组
 * ============================================================ */
import { forwardRef } from "react";
export const RadioGroup = forwardRef(function RadioGroup({ value, options, onChange, disabled = false, vertical = false, name, "aria-label": ariaLabel, }, ref) {
    const groupName = name ?? `novel-radio-${Math.random().toString(36).slice(2)}`;
    const cls = [
        "novel-radio-group",
        vertical ? "novel-radio-group--vertical" : "",
    ]
        .filter(Boolean)
        .join(" ");
    return (_jsx("div", { ref: ref, className: cls, role: "radiogroup", "aria-label": ariaLabel, children: options.map((opt) => {
            const isChecked = value === opt.value;
            const isDisabled = disabled || opt.disabled;
            const itemCls = [
                "novel-radio",
                isChecked ? "is-checked" : "",
                isDisabled ? "is-disabled" : "",
            ]
                .filter(Boolean)
                .join(" ");
            return (_jsxs("label", { className: itemCls, children: [_jsx("span", { className: "novel-radio__box", children: _jsx("span", { className: "novel-radio__dot", "aria-hidden": true }) }), _jsx("input", { type: "radio", className: "novel-radio__input", name: groupName, checked: isChecked, disabled: isDisabled, onChange: () => !isDisabled && onChange(opt.value) }), _jsx("span", { className: "novel-radio__label", children: opt.label })] }, opt.value));
        }) }));
});
//# sourceMappingURL=Radio.js.map