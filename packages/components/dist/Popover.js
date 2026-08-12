import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * Popover · 02 §1.8
 * 富内容；hover/click 触发
 * ============================================================ */
import { useEffect, useRef, useState } from "react";
import { Popper } from "./Popper.js";
export function Popover({ title, content, trigger = "hover", placement = "top", children, }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    // click 模式下点击外部关闭
    useEffect(() => {
        if (trigger !== "click" || !open)
            return;
        const onClick = (e) => {
            if (containerRef.current &&
                !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [trigger, open]);
    const triggerHandlers = trigger === "hover"
        ? {
            onMouseEnter: () => setOpen(true),
            onMouseLeave: () => setOpen(false),
        }
        : {
            onClick: (e) => {
                e.stopPropagation();
                setOpen((o) => !o);
            },
        };
    return (_jsx("div", { ref: containerRef, style: { display: "inline-flex" }, children: _jsx(Popper, { open: open, placement: placement, offset: 8, trigger: _jsx("span", { ...triggerHandlers, style: { display: "inline-flex" }, children: children }), children: ({ floatRef, floatStyle, ready }) => (_jsxs("div", { ref: floatRef, className: `novel-popover ${placement.startsWith("bottom") ? "novel-popover--bottom" : ""} ${ready ? "is-ready" : ""}`, style: floatStyle, role: "dialog", children: [title != null ? (_jsx("div", { className: "novel-popover__header", children: title })) : null, _jsx("div", { className: "novel-popover__body", children: content })] })) }) }));
}
//# sourceMappingURL=Popover.js.map