import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const DefaultIllustration = () => (_jsxs("svg", { viewBox: "0 0 120 120", width: "120", height: "120", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: [_jsx("rect", { x: "20", y: "30", width: "80", height: "64", rx: "4" }), _jsx("path", { d: "M30 50h40M30 62h50M30 74h30" }), _jsx("circle", { cx: "92", cy: "48", r: "14", strokeDasharray: "3 3" })] }));
export function EmptyState({ title, description, action, illustration, }) {
    return (_jsxs("div", { className: "novel-empty", role: "status", children: [_jsx("div", { className: "novel-empty__illustration", children: illustration ?? _jsx(DefaultIllustration, {}) }), _jsx("div", { className: "novel-empty__title", children: title }), description != null ? (_jsx("div", { className: "novel-empty__description", children: description })) : null, action != null ? (_jsx("div", { className: "novel-empty__actions", children: action })) : null] }));
}
export function Skeleton({ rows = 3, avatar = false, active = true, loading = true, children, }) {
    if (!loading)
        return _jsx(_Fragment, { children: children });
    return (_jsx("div", { className: `novel-skeleton ${active ? "is-active" : ""}`, role: "status", "aria-live": "polite", children: _jsxs("div", { className: "novel-skeleton__row", children: [avatar ? _jsx("div", { className: "novel-skeleton__avatar" }) : null, _jsx("div", { style: { flex: 1 }, children: Array.from({ length: rows }).map((_, i) => (_jsx("div", { className: "novel-skeleton__line" }, i))) })] }) }));
}
//# sourceMappingURL=EmptyState.js.map