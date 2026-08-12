import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * Tooltip · 02 §1.8
 * 纯文本提示；hover/focus 触发；dur-fast 渐显
 * ============================================================ */
import { useState } from "react";
import { Popper } from "./Popper.js";
export function Tooltip({ title, placement = "top", children }) {
    const [open, setOpen] = useState(false);
    return (_jsx(Popper, { open: open, placement: placement, offset: 6, trigger: _jsx("span", { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false), onFocus: () => setOpen(true), onBlur: () => setOpen(false), style: { display: "inline-flex" }, children: children }), children: ({ floatRef, floatStyle, ready }) => (_jsx("div", { ref: floatRef, className: `novel-tooltip ${placement.startsWith("bottom") ? "novel-tooltip--bottom" : ""} ${ready ? "is-ready" : ""}`, style: floatStyle, role: "tooltip", children: title })) }));
}
//# sourceMappingURL=Tooltip.js.map