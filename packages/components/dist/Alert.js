import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* ============================================================
 * Alert / Message / Notification · 02 §1.13
 * - Alert: 内联 React 组件
 * - message / notification: 命令式 API（基于 portal + 内部状态管理）
 * ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
import { createPortal } from "react-dom";
import { StatusSuccess, StatusWarning, StatusError, StatusInfo, NavigationClose, } from "@novel/icons";
const STATUS_ICON_COMPONENT = {
    success: StatusSuccess,
    warning: StatusWarning,
    error: StatusError,
    info: StatusInfo,
};
function StatusIcon({ type, className, }) {
    const S = STATUS_ICON_COMPONENT[type];
    return _jsx(S, { className: className, "aria-hidden": "true" });
}
export function Alert({ type = "info", message, description, closable = false, onClose, }) {
    const [closed, setClosed] = useState(false);
    if (closed)
        return null;
    const handleClose = () => {
        setClosed(true);
        onClose?.();
    };
    return (_jsxs("div", { className: `novel-alert novel-alert--${type}`, role: "alert", children: [_jsx(StatusIcon, { type: type, className: "novel-alert__icon" }), _jsxs("div", { className: "novel-alert__body", children: [_jsx("div", { className: "novel-alert__message", children: message }), description != null ? (_jsx("div", { className: "novel-alert__description", children: description })) : null] }), closable ? (_jsx("button", { type: "button", className: "novel-alert__close", onClick: handleClose, "aria-label": "\u5173\u95ED", children: _jsx(NavigationClose, { size: "sm", "aria-hidden": "true" }) })) : null] }));
}
const FeedbackContext = createContext(null);
/** Provider 应在应用根节点包裹 */
export function FeedbackProvider({ children }) {
    const [msgs, setMsgs] = useState([]);
    const [notifs, setNotifs] = useState([]);
    const counter = useRef(0);
    const removeMsg = useCallback((key) => {
        setMsgs((list) => list.filter((m) => m.key !== key));
    }, []);
    const removeNotif = useCallback((key) => {
        setNotifs((list) => list.filter((n) => n.key !== key));
    }, []);
    const message = useCallback((type, content, duration = 3) => {
        const key = `m${counter.current++}`;
        setMsgs((list) => [...list, { key, type, content, ready: false }]);
        requestAnimationFrame(() => {
            setMsgs((list) => list.map((m) => (m.key === key ? { ...m, ready: true } : m)));
        });
        if (duration > 0) {
            setTimeout(() => removeMsg(key), duration * 1000);
        }
    }, [removeMsg]);
    const notification = useCallback((opts) => {
        const { type = "info", title, description, duration = 4.5 } = opts;
        const key = `n${counter.current++}`;
        setNotifs((list) => [
            ...list,
            { key, type, title, description, ready: false },
        ]);
        requestAnimationFrame(() => {
            setNotifs((list) => list.map((n) => (n.key === key ? { ...n, ready: true } : n)));
        });
        if (duration > 0) {
            setTimeout(() => removeNotif(key), duration * 1000);
        }
    }, [removeNotif]);
    // 限制 Notification 最多 3 条
    useEffect(() => {
        if (notifs.length > 3) {
            setNotifs((list) => list.slice(list.length - 3));
        }
    }, [notifs.length]);
    const value = useMemo(() => ({ message, notification }), [message, notification]);
    return (_jsxs(FeedbackContext.Provider, { value: value, children: [children, typeof document !== "undefined"
                ? createPortal(_jsxs(_Fragment, { children: [msgs.length > 0 ? (_jsx("div", { className: "novel-message-container", "aria-live": "polite", children: msgs.map((m) => (_jsxs("div", { className: `novel-message ${m.ready ? "is-ready" : ""}`, role: "status", children: [_jsx(StatusIcon, { type: m.type, className: "novel-message__icon" }), _jsx("span", { children: m.content })] }, m.key))) })) : null, notifs.length > 0 ? (_jsx("div", { className: "novel-notification-container", "aria-live": "polite", children: notifs.map((n) => (_jsxs("div", { className: `novel-notification ${n.ready ? "is-ready" : ""}`, role: "alert", children: [_jsx(StatusIcon, { type: n.type, className: "novel-alert__icon" }), _jsxs("div", { className: "novel-notification__body", children: [_jsx("div", { className: "novel-notification__title", children: n.title }), n.description != null ? (_jsx("div", { className: "novel-notification__description", children: n.description })) : null] }), _jsx("button", { type: "button", className: "novel-notification__close", onClick: () => removeNotif(n.key), "aria-label": "\u5173\u95ED", children: _jsx(NavigationClose, { size: "sm", "aria-hidden": "true" }) })] }, n.key))) })) : null] }), document.body)
                : null] }));
}
/** Hook：消费 message / notification 命令式 API */
export function useFeedback() {
    const ctx = useContext(FeedbackContext);
    if (!ctx) {
        throw new Error("useFeedback 必须在 <FeedbackProvider> 内使用");
    }
    return ctx;
}
/**
 * 命令式 message 入口（需要应用根已挂 FeedbackProvider）。
 * 用法：const { message } = useFeedback(); message.success('已保存');
 */
export function createMessageApi(ctx) {
    return {
        success: (content, duration) => ctx.message("success", content, duration),
        warning: (content, duration) => ctx.message("warning", content, duration),
        error: (content, duration) => ctx.message("error", content, duration),
        info: (content, duration) => ctx.message("info", content, duration),
    };
}
export function createNotificationApi(ctx) {
    return {
        open: (opts) => ctx.notification(opts),
        success: (title, description, duration) => ctx.notification({ type: "success", title, description, duration }),
        warning: (title, description, duration) => ctx.notification({ type: "warning", title, description, duration }),
        error: (title, description, duration) => ctx.notification({ type: "error", title, description, duration }),
        info: (title, description, duration) => ctx.notification({ type: "info", title, description, duration }),
    };
}
//# sourceMappingURL=Alert.js.map