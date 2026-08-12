import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const DEFAULT_LABEL = {
    ongoing: "连载中",
    completed: "已完结",
    paused: "暂停更新",
    reviewing: "审核中",
    offline: "已下架",
};
export function ContentStatus({ status, size = "md", withDot = true, children, }) {
    const label = children ?? DEFAULT_LABEL[status];
    return (_jsxs("span", { className: `novel-content-status novel-content-status--${status} novel-content-status--${size}`, role: "status", children: [withDot ? (_jsx("span", { className: "novel-content-status__dot", "aria-hidden": true })) : null, _jsx("span", { className: "novel-content-status__label", children: label })] }));
}
//# sourceMappingURL=ContentStatus.js.map