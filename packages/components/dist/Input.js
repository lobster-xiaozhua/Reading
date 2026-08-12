import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * Input · 02 §1.2
 * 受控单行输入；3 尺寸；3 校验态；prefix/suffix 容器
 * ============================================================ */
import { forwardRef } from "react";
export const Input = forwardRef(function Input({ size = "md", status = "default", disabled = false, prefix, suffix, className, onChange, ...rest }, ref) {
    const cls = [
        "novel-input",
        `novel-input--${size}`,
        status !== "default" ? `novel-input--${status}` : "",
        disabled ? "is-disabled" : "",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    const ariaInvalid = status === "error" ? true : undefined;
    return (_jsxs("div", { className: cls, "aria-disabled": disabled, children: [prefix ? _jsx("span", { className: "novel-input__prefix", children: prefix }) : null, _jsx("input", { ref: ref, className: "novel-input__input", disabled: disabled, "aria-invalid": ariaInvalid, onChange: (e) => onChange?.(e.target.value, e), ...rest }), suffix ? _jsx("span", { className: "novel-input__suffix", children: suffix }) : null] }));
});
//# sourceMappingURL=Input.js.map