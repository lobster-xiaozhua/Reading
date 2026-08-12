import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* ============================================================
 * ChapterList · 03 §6.2
 * 章节列表：虚拟滚动（>500 章）/ VIP 锁 / 当前章高亮 / 正倒序
 * 列表项固定 48px，虚拟滚动仅渲染可视区 + 上下各 5 条缓冲
 * ============================================================ */
import { memo, useCallback, useMemo, useRef, useState } from "react";
/** 列表项固定高度（03 §6.2 规格：48px） */
const ITEM_HEIGHT = 48;
/** 虚拟滚动上下缓冲条数 */
const BUFFER = 5;
/* ---------- 内联图标（与 Drawer/Select 一致风格） ---------- */
function SortIcon({ desc }) {
    return (_jsxs("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: [_jsx("path", { d: desc ? "M7 4v16M7 4L4 7M7 4l3 3" : "M17 4v16M17 20l-3-3M17 20l3-3" }), _jsx("path", { d: desc ? "M17 20V4" : "M7 4v16", opacity: "0.4" })] }));
}
function LockIcon() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", width: "12", height: "12", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: [_jsx("rect", { x: "5", y: "11", width: "14", height: "9", rx: "1" }), _jsx("path", { d: "M8 11V7a4 4 0 0 1 8 0v4" })] }));
}
function Spinner() {
    return (_jsx("svg", { className: "novel-chapter-list__spinner", viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", "aria-hidden": true, children: _jsx("path", { d: "M12 3a9 9 0 1 0 9 9" }) }));
}
export function ChapterList({ chapters, order = "asc", activeId, onSelect, virtual = false, viewportHeight = 600, showVip = true, onOrderChange, onLoadMore, hasMore = false, loading = false, className, }) {
    const scrollRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);
    // 排序后的章节（倒序仅在展示层翻转，不修改源数据）
    const ordered = useMemo(() => {
        if (order === "desc")
            return [...chapters].reverse();
        return chapters;
    }, [chapters, order]);
    const total = ordered.length;
    // 虚拟滚动可视范围计算
    const range = useMemo(() => {
        if (!virtual)
            return { start: 0, end: total };
        const viewH = viewportHeight;
        const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
        const visibleCount = Math.ceil(viewH / ITEM_HEIGHT) + BUFFER * 2;
        const endIdx = Math.min(total, startIdx + visibleCount);
        return { start: startIdx, end: endIdx };
    }, [virtual, total, scrollTop, viewportHeight]);
    const visible = ordered.slice(range.start, range.end);
    const handleSelect = useCallback((ch) => {
        onSelect?.(ch);
    }, [onSelect]);
    const rootCls = ["novel-chapter-list", className ?? ""]
        .filter(Boolean)
        .join(" ");
    const viewportStyle = virtual
        ? { height: `${viewportHeight}px`, overflowY: "auto" }
        : {};
    // 虚拟滚动总高占位
    const totalH = total * ITEM_HEIGHT;
    const offsetTop = range.start * ITEM_HEIGHT;
    return (_jsxs("div", { className: rootCls, children: [onOrderChange ? (_jsxs("div", { className: "novel-chapter-list__toolbar", children: [_jsxs("button", { type: "button", className: "novel-chapter-list__order-btn", onClick: () => onOrderChange(order === "asc" ? "desc" : "asc"), "aria-label": order === "asc" ? "切换为倒序" : "切换为正序", children: [_jsx(SortIcon, { desc: order === "desc" }), _jsx("span", { children: order === "asc" ? "正序" : "倒序" })] }), _jsxs("span", { className: "novel-chapter-list__count", children: ["\u5171 ", total, " \u7AE0"] })] })) : null, _jsx("div", { ref: scrollRef, className: "novel-chapter-list__viewport", style: viewportStyle, onScroll: virtual ? (e) => setScrollTop(e.currentTarget.scrollTop) : undefined, role: "listbox", "aria-label": "\u7AE0\u8282\u76EE\u5F55", children: virtual ? (_jsx("div", { style: { height: `${totalH}px`, position: "relative" }, children: _jsx("div", { style: { transform: `translateY(${offsetTop}px)` }, children: visible.map((ch, i) => (_jsx(ChapterItem, { chapter: ch, index: range.start + i, active: ch.id === activeId, showVip: showVip, onSelect: handleSelect }, ch.id))) }) })) : (_jsxs(_Fragment, { children: [visible.map((ch, i) => (_jsx(ChapterItem, { chapter: ch, index: i, active: ch.id === activeId, showVip: showVip, onSelect: handleSelect }, ch.id))), onLoadMore && hasMore ? (_jsx("div", { className: "novel-chapter-list__load-more", children: _jsxs("button", { type: "button", className: "novel-chapter-list__load-more-btn", onClick: onLoadMore, disabled: loading, children: [loading ? _jsx(Spinner, {}) : null, loading ? "加载中…" : "加载更多"] }) })) : null] })) })] }));
}
/* ---------- 单个章节项 ---------- */
const ChapterItem = memo(function ChapterItem({ chapter, index, active, showVip, onSelect, }) {
    const cls = [
        "novel-chapter-list__item",
        active ? "is-active" : "",
        chapter.read ? "is-read" : "",
    ]
        .filter(Boolean)
        .join(" ");
    return (_jsxs("button", { type: "button", className: cls, role: "option", "aria-selected": active, style: { height: `${ITEM_HEIGHT}px` }, onClick: () => onSelect(chapter), title: chapter.title, children: [_jsx("span", { className: "novel-chapter-list__index", children: index + 1 }), _jsx("span", { className: "novel-chapter-list__title", children: chapter.title }), showVip && chapter.isVip ? (_jsxs("span", { className: "novel-chapter-list__vip", "aria-label": "VIP \u7AE0\u8282\uFF0C\u9700\u8981 VIP \u4F1A\u5458", children: [_jsx(LockIcon, {}), _jsx("span", { "aria-hidden": true, children: "VIP" })] })) : null, chapter.wordCount != null ? (_jsx("span", { className: "novel-chapter-list__meta", children: formatWordCount(chapter.wordCount) })) : null] }));
});
/** 字数简写：<1万 原值；≥1万 显示「X.X万字」 */
function formatWordCount(n) {
    if (n < 10000)
        return `${n}`;
    const wan = n / 10000;
    return `${wan.toFixed(wan >= 100 ? 0 : 1)}万字`;
}
//# sourceMappingURL=ChapterList.js.map