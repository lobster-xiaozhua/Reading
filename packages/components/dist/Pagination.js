import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * Pagination · 02 §1.15
 * 省略号折叠；prev/next；快速跳转（可选）
 * ============================================================ */
import { useMemo } from "react";
import { NavigationChevronLeft, NavigationChevronRight } from "@novel/icons";
/** 计算需要显示的页码：用 -1 表示省略号 */
function range(current, total, siblings) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const left = Math.max(1, current - siblings);
    const right = Math.min(total, current + siblings);
    const showLeftEllipsis = left > 2;
    const showRightEllipsis = right < total - 1;
    const pages = [1];
    if (showLeftEllipsis)
        pages.push(-1);
    for (let i = left; i <= right; i++) {
        if (i !== 1 && i !== total)
            pages.push(i);
    }
    if (showRightEllipsis)
        pages.push(-1);
    if (total !== 1)
        pages.push(total);
    return pages;
}
export function Pagination({ current, total, siblings = 1, showJumper = false, showTotal = false, totalItems, onChange, }) {
    const pages = useMemo(() => range(current, total, siblings), [current, total, siblings]);
    const go = (p) => {
        if (p < 1 || p > total || p === current)
            return;
        onChange?.(p);
    };
    const renderItem = (p, key) => {
        if (p === -1) {
            return (_jsx("li", { className: "novel-pagination__item novel-pagination__ellipsis", "aria-hidden": true, children: "\u2026" }, `ellipsis-${key}`));
        }
        const isActive = p === current;
        return (_jsx("li", { children: _jsx("button", { type: "button", className: `novel-pagination__item ${isActive ? "is-active" : ""}`, "aria-current": isActive ? "page" : undefined, "aria-label": `第 ${p} 页`, onClick: () => go(p), children: p }) }, p));
    };
    const prevDisabled = current <= 1;
    const nextDisabled = current >= total;
    return (_jsxs("nav", { className: "novel-pagination", "aria-label": "\u5206\u9875", children: [showTotal && totalItems != null ? (_jsxs("span", { className: "novel-pagination__total", children: ["\u5171 ", totalItems, " \u6761"] })) : null, _jsxs("ul", { className: "novel-pagination__list", children: [_jsx("li", { children: _jsx("button", { type: "button", className: "novel-pagination__item novel-pagination__nav", onClick: () => go(current - 1), disabled: prevDisabled, "aria-label": "\u4E0A\u4E00\u9875", children: _jsx(NavigationChevronLeft, { size: "sm", "aria-hidden": "true" }) }) }), pages.map((p, i) => renderItem(p, i)), _jsx("li", { children: _jsx("button", { type: "button", className: "novel-pagination__item novel-pagination__nav", onClick: () => go(current + 1), disabled: nextDisabled, "aria-label": "\u4E0B\u4E00\u9875", children: _jsx(NavigationChevronRight, { size: "sm", "aria-hidden": "true" }) }) })] }), showJumper && total > 1 ? (_jsxs("span", { className: "novel-pagination__jumper", children: ["\u8DF3\u81F3", _jsx("input", { type: "number", min: 1, max: total, className: "novel-pagination__jumper-input", onKeyDown: (e) => {
                            if (e.key === "Enter") {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v))
                                    go(v);
                            }
                        }, "aria-label": "\u8DF3\u8F6C\u5230\u6307\u5B9A\u9875" }), "\u9875"] })) : null] }));
}
//# sourceMappingURL=Pagination.js.map