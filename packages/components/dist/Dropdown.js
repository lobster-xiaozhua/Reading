import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * Dropdown · 02 §1.9
 * 下拉菜单；items + danger + divider
 * ============================================================ */
import { useEffect, useRef, useState } from "react";
import { Popper } from "./Popper.js";
export function Dropdown({ items, trigger = "hover", placement = "bottomStart", onClick, children, }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    useEffect(() => {
        if (trigger !== "click" || !open)
            return;
        const onDoc = (e) => {
            if (containerRef.current &&
                !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onEsc = (e) => {
            if (e.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onEsc);
        };
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
    return (_jsx("div", { ref: containerRef, style: { display: "inline-flex" }, children: _jsx(Popper, { open: open, placement: placement, offset: 4, trigger: _jsx("span", { ...triggerHandlers, style: { display: "inline-flex" }, children: children }), children: ({ floatRef, floatStyle, ready }) => (_jsx("div", { ref: floatRef, className: `novel-dropdown__menu ${ready ? "is-ready" : ""}`, style: floatStyle, role: "menu", children: items.map((item) => item.divider ? (_jsx("div", { className: "novel-dropdown__divider", role: "separator" }, item.key)) : (_jsx("button", { type: "button", role: "menuitem", className: [
                        "novel-dropdown__item",
                        item.disabled ? "is-disabled" : "",
                        item.danger ? "is-danger" : "",
                    ]
                        .filter(Boolean)
                        .join(" "), disabled: item.disabled, onClick: () => {
                        if (item.disabled)
                            return;
                        onClick?.(item.key);
                        setOpen(false);
                    }, children: item.label }, item.key))) })) }) }));
}
//# sourceMappingURL=Dropdown.js.map