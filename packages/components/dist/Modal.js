import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* ============================================================
 * Modal · 02 §1.4
 * 遮罩 + 缩放渐显；Esc 关闭；focus trap（简化版）
 * ============================================================ */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavigationClose } from "@novel/icons";
export function Modal({ open, title, width = 480, closable = true, maskClosable = true, onCancel, footer, children, }) {
    const [ready, setReady] = useState(false);
    const [exiting, setExiting] = useState(false);
    const modalRef = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, [open]);
    useEffect(() => {
        if (open) {
            setExiting(false);
            setReady(false);
            return;
        }
        setExiting(true);
        const id = setTimeout(() => setExiting(false), 240);
        return () => clearTimeout(id);
    }, [open]);
    useEffect(() => {
        if (!open)
            return;
        const onEsc = (e) => {
            if (e.key === "Escape")
                onCancel?.();
        };
        document.addEventListener("keydown", onEsc);
        // 简易 focus trap：打开后聚焦 modal
        const prevActive = document.activeElement;
        modalRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", onEsc);
            prevActive?.focus?.();
        };
    }, [open, onCancel]);
    useEffect(() => {
        if (open) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prev;
            };
        }
        return;
    }, [open]);
    if (!open && !exiting)
        return null;
    const widthStyle = typeof width === "number" ? `${width}px` : width;
    return typeof document === "undefined"
        ? null
        : createPortal(_jsxs(_Fragment, { children: [_jsx("div", { className: `novel-modal__mask ${ready ? "is-ready" : ""}`, onClick: () => maskClosable && onCancel?.() }), _jsxs("div", { ref: modalRef, className: `novel-modal ${ready ? "is-ready" : ""}`, style: { width: widthStyle }, role: "dialog", "aria-modal": "true", "aria-label": typeof title === "string" ? title : undefined, tabIndex: -1, children: [(title != null || closable) && (_jsxs("div", { className: "novel-modal__header", children: [_jsx("div", { children: title }), closable ? (_jsx("button", { type: "button", className: "novel-modal__close", onClick: onCancel, "aria-label": "\u5173\u95ED", children: _jsx(NavigationClose, { size: "sm", "aria-hidden": "true" }) })) : null] })), _jsx("div", { className: "novel-modal__body", children: children }), footer !== null ? (_jsx("div", { className: "novel-modal__footer", children: footer })) : null] })] }), document.body);
}
//# sourceMappingURL=Modal.js.map