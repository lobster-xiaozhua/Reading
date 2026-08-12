import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * NotificationBadge · 03 §6.12
 * 追更通知：未读 rose 红点 / 已读 / hover 忽略 / 多条合并聚合卡
 * ============================================================ */
import { NavigationClose } from "@novel/icons";
/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 日期 */
function formatRelative(input) {
    const date = input instanceof Date ? input : new Date(input);
    const diff = Date.now() - date.getTime();
    if (Number.isNaN(diff))
        return "";
    const min = Math.floor(diff / 60000);
    if (min < 1)
        return "刚刚";
    if (min < 60)
        return `${min} 分钟前`;
    const hour = Math.floor(min / 60);
    if (hour < 24)
        return `${hour} 小时前`;
    const day = Math.floor(hour / 24);
    if (day < 30)
        return `${day} 天前`;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
export function NotificationBadge({ novelTitle, chapterCount, updateTime, read = false, aggregateCount, onClick, onDismiss, className, }) {
    const rootCls = [
        "novel-notify",
        read ? "is-read" : "is-unread",
        onClick ? "is-clickable" : "",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    /* ---------- 聚合卡片（多条合并） ---------- */
    if (aggregateCount != null && aggregateCount > 0) {
        return (_jsxs("div", { className: `${rootCls} novel-notify--aggregate`, role: "button", tabIndex: onClick ? 0 : undefined, onClick: onClick, onKeyDown: (e) => {
                if (onClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onClick();
                }
            }, "aria-label": `${aggregateCount} 本书有更新`, children: [_jsx("span", { className: "novel-notify__dot", "aria-hidden": true }), _jsxs("span", { className: "novel-notify__aggregate-text", children: [aggregateCount, " \u672C\u4E66\u6709\u66F4\u65B0"] }), _jsx("span", { className: "novel-notify__chevron", "aria-hidden": true, children: "\u203A" })] }));
    }
    /* ---------- 单条通知 ---------- */
    const timeText = updateTime != null ? formatRelative(updateTime) : "";
    return (_jsxs("div", { className: rootCls, role: onClick ? "button" : undefined, tabIndex: onClick ? 0 : undefined, onClick: onClick, onKeyDown: (e) => {
            if (onClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onClick();
            }
        }, "aria-label": read
            ? `${novelTitle} 更新 ${chapterCount} 章`
            : `${novelTitle} 更新 ${chapterCount} 章，未读`, children: [_jsx("span", { className: "novel-notify__dot", "aria-hidden": true }), _jsxs("div", { className: "novel-notify__body", children: [_jsxs("div", { className: "novel-notify__title-row", children: [_jsx("span", { className: "novel-notify__title", children: novelTitle }), chapterCount != null ? (_jsxs("span", { className: "novel-notify__count", children: ["\u66F4\u65B0 ", chapterCount, " \u7AE0"] })) : null] }), timeText ? (_jsx("span", { className: "novel-notify__time", children: timeText })) : null] }), onDismiss ? (_jsx("button", { type: "button", className: "novel-notify__dismiss", "aria-label": "\u5FFD\u7565\u6B64\u901A\u77E5", onClick: (e) => {
                    e.stopPropagation();
                    onDismiss();
                }, children: _jsx(NavigationClose, { size: "sm", "aria-hidden": "true" }) })) : null] }));
}
//# sourceMappingURL=NotificationBadge.js.map