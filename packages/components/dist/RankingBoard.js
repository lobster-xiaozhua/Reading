import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* ============================================================
 * RankingBoard · P6 §1
 * 排行榜：人气/收藏/月票/新书 4 Tab；TOP1-3 奖牌；排名变化箭头
 * 行高 56px；切 Tab dur-normal 淡入；loading 骨架
 * ============================================================ */
import { useState } from "react";
import { NovelTrendingUp, NovelTrendingDown } from "@novel/icons";
const TABS = [
    { key: "hot", label: "人气榜" },
    { key: "follow", label: "收藏榜" },
    { key: "ticket", label: "月票榜" },
    { key: "new", label: "新书榜" },
];
const TAB_LABEL = {
    hot: "人气榜",
    follow: "收藏榜",
    ticket: "月票榜",
    new: "新书榜",
};
/** 排名变化：上升/下降/新上榜/持平
 * P8-A6 色觉障碍友好：颜色之外提供「升/降」文字 + 方向箭头双重表达，
 * 避免仅靠绿/红区分升降 */
function RankTrend({ rank, prevRank }) {
    if (prevRank === 0) {
        return (_jsx("span", { className: "novel-ranking__trend novel-ranking__trend--new", "aria-label": "\u65B0\u4E0A\u699C", children: "NEW" }));
    }
    if (prevRank === rank) {
        return (_jsxs("span", { className: "novel-ranking__trend novel-ranking__trend--flat", "aria-label": "\u6392\u540D\u6301\u5E73", children: [_jsx("span", { "aria-hidden": true, children: "\u2014" }), _jsx("span", { className: "sr-only", children: "\u6301\u5E73" })] }));
    }
    if (rank < prevRank) {
        const delta = prevRank - rank;
        return (_jsxs("span", { className: "novel-ranking__trend novel-ranking__trend--up", "aria-label": `上升 ${delta} 位`, children: [_jsx(NovelTrendingUp, { size: "xs", "aria-hidden": "true" }), _jsx("span", { className: "novel-ranking__trend-label", "aria-hidden": true, children: "\u5347" }), delta] }));
    }
    const delta = rank - prevRank;
    return (_jsxs("span", { className: "novel-ranking__trend novel-ranking__trend--down", "aria-label": `下降 ${delta} 位`, children: [_jsx(NovelTrendingDown, { size: "xs", "aria-hidden": "true" }), _jsx("span", { className: "novel-ranking__trend-label", "aria-hidden": true, children: "\u964D" }), delta] }));
}
/** TOP1-3 奖牌（金/银/铜 24px 圆形） */
function Medal({ rank }) {
    const tier = rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze";
    return (_jsx("span", { className: `novel-ranking__medal novel-ranking__medal--${tier}`, "aria-label": `第 ${rank} 名`, children: rank }));
}
export function RankingBoard({ items, type = "hot", rankIcon = true, maxCount = 10, onTabChange, onSelect, loading = false, className, }) {
    const [active, setActive] = useState(type);
    const handleTab = (t) => {
        if (t === active)
            return;
        setActive(t);
        onTabChange?.(t);
    };
    const rootCls = ["novel-ranking", className ?? ""].filter(Boolean).join(" ");
    const visible = items.slice(0, maxCount);
    return (_jsxs("section", { className: rootCls, "aria-label": `${TAB_LABEL[active]}排行榜`, children: [_jsx("div", { className: "novel-ranking__tabs", role: "tablist", children: TABS.map((t) => (_jsx("button", { type: "button", role: "tab", "aria-selected": active === t.key, className: `novel-ranking__tab ${active === t.key ? "is-active" : ""}`, onClick: () => handleTab(t.key), children: t.label }, t.key))) }), _jsx("ol", { className: "novel-ranking__list", "aria-busy": loading || undefined, children: loading ? (_jsx(RankingSkeleton, { rows: maxCount })) : visible.length === 0 ? (_jsx("li", { className: "novel-ranking__empty", children: "\u6682\u65E0\u699C\u5355\u6570\u636E" })) : (visible.map((item) => (_jsx(RankingRow, { item: item, rankIcon: rankIcon, onSelect: onSelect }, item.book.id)))) }, active)] }));
}
function RankingRow({ item, rankIcon, onSelect, }) {
    const { book, rank, prevRank } = item;
    const isTop3 = rank <= 3;
    const clickable = typeof onSelect === "function";
    const cls = [
        "novel-ranking__row",
        isTop3 ? "is-top" : "",
        clickable ? "is-clickable" : "",
    ]
        .filter(Boolean)
        .join(" ");
    const handleKeyDown = (e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onSelect?.(book);
        }
    };
    return (_jsxs("li", { className: cls, tabIndex: clickable ? 0 : undefined, onClick: clickable ? () => onSelect?.(book) : undefined, onKeyDown: handleKeyDown, "aria-label": `第 ${rank} 名 ${book.title} ${book.author}`, children: [_jsx("div", { className: "novel-ranking__rank", children: rankIcon && isTop3 ? (_jsx(Medal, { rank: rank })) : (_jsx("span", { className: "novel-ranking__num", "aria-hidden": true, children: rank })) }), _jsxs("div", { className: "novel-ranking__main", children: [_jsx("div", { className: "novel-ranking__title", title: book.title, children: book.title }), _jsx("div", { className: "novel-ranking__author", children: book.author })] }), _jsxs("div", { className: "novel-ranking__meta", children: [book.rating != null ? (_jsxs("span", { className: "novel-ranking__score", children: [_jsx("span", { className: "novel-ranking__star", "aria-hidden": true, children: "\u2605" }), _jsx("span", { className: "novel-ranking__score-num", children: book.rating.toFixed(1) })] })) : null, _jsx(RankTrend, { rank: rank, prevRank: prevRank })] })] }));
}
function RankingSkeleton({ rows }) {
    return (_jsx(_Fragment, { children: Array.from({ length: rows }).map((_, i) => (_jsxs("li", { className: "novel-ranking__row is-skeleton", "aria-hidden": true, children: [_jsx("div", { className: "novel-ranking__skeleton-rank" }), _jsxs("div", { className: "novel-ranking__skeleton-body", children: [_jsx("div", { className: "novel-ranking__skeleton-line novel-ranking__skeleton-line--title" }), _jsx("div", { className: "novel-ranking__skeleton-line novel-ranking__skeleton-line--sub" })] }), _jsx("div", { className: "novel-ranking__skeleton-line novel-ranking__skeleton-line--score" })] }, i))) }));
}
//# sourceMappingURL=RankingBoard.js.map