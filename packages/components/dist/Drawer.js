import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* ============================================================
 * Drawer · 02 §1.5
 * 侧边抽屉：滑入动画、遮罩、Esc 关闭、内容滚动
 * 用于次级任务流 / 详情面板
 * ============================================================ */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavigationClose } from "@novel/icons";
export function Drawer({ open, title, placement = "right", width = 378, closable = true, maskClosable = true, onClose, footer, children, }) {
    const [ready, setReady] = useState(false);
    const [exiting, setExiting] = useState(false);
    const panelRef = useRef(null);
    // 进入：下一帧触发 ready 以应用过渡
    useEffect(() => {
        if (!open)
            return;
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, [open]);
    // 退出：保持挂载以播放退出动画
    useEffect(() => {
        if (open) {
            setExiting(false);
            setReady(false);
            return;
        }
        setExiting(true);
        const id = setTimeout(() => setExiting(false), 200);
        return () => clearTimeout(id);
    }, [open]);
    // Esc 关闭
    useEffect(() => {
        if (!open)
            return;
        const onEsc = (e) => {
            if (e.key === "Escape")
                onClose?.();
        };
        document.addEventListener("keydown", onEsc);
        return () => document.removeEventListener("keydown", onEsc);
    }, [open, onClose]);
    // 锁定 body 滚动
    useEffect(() => {
        if (!open)
            return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);
    if (!open && !exiting)
        return null;
    const widthStyle = typeof width === "number" ? `${width}px` : width;
    return typeof document === "undefined"
        ? null
        : createPortal(_jsxs(_Fragment, { children: [_jsx("div", { className: `novel-drawer__mask ${ready ? "is-ready" : ""}`, onClick: () => maskClosable && onClose?.() }), _jsxs("div", { ref: panelRef, className: `novel-drawer novel-drawer--${placement} ${ready ? "is-ready" : ""}`, style: { width: widthStyle }, role: "dialog", "aria-modal": "true", "aria-label": typeof title === "string" ? title : undefined, children: [(title != null || closable) && (_jsxs("div", { className: "novel-drawer__header", children: [_jsx("div", { className: "novel-drawer__title", children: title }), closable ? (_jsx("button", { type: "button", className: "novel-drawer__close", onClick: onClose, "aria-label": "\u5173\u95ED", children: _jsx(NavigationClose, { size: "sm", "aria-hidden": "true" }) })) : null] })), _jsx("div", { className: "novel-drawer__body", children: children }), footer != null ? (_jsx("div", { className: "novel-drawer__footer", children: footer })) : null] })] }), document.body);
}
//# sourceMappingURL=Drawer.js.map