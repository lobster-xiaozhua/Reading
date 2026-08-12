import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StatCard({ value, label, className = "", mono = true, }) {
    return (_jsxs("div", { className: `stat-card ${className}`, children: [_jsx("span", { className: `stat-card__value ${mono ? "stat-card__value--mono" : ""}`, children: value }), _jsx("span", { className: "stat-card__label", children: label })] }));
}
//# sourceMappingURL=StatCard.js.map