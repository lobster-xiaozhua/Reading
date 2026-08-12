import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* ============================================================
 * BookRecommend · P6 §5
 * 智能推荐横滑卡：标题 + 换一批(旋转 360) + scroll-snap 横滑
 * 单卡 100px，封面 3:4，匹配度标签，评分；loading 骨架
 * ============================================================ */
import { useState } from "react";
import { NovelMedal } from "@novel/icons";
export function BookRecommend({ title = "为你推荐", books, loading = false, onRefresh, onSelect, className, }) {
    const [spinId, setSpinId] = useState(0);
    const rootCls = ["novel-recommend", className ?? ""]
        .filter(Boolean)
        .join(" ");
    const handleRefresh = () => {
        if (!onRefresh)
            return;
        setSpinId((n) => n + 1);
        onRefresh();
    };
    return (_jsxs("section", { className: rootCls, "aria-label": title, children: [_jsxs("div", { className: "novel-recommend__head", children: [_jsx("h3", { className: "novel-recommend__title", children: title }), onRefresh ? (_jsxs("button", { type: "button", className: "novel-recommend__refresh", onClick: handleRefresh, "aria-label": "\u6362\u4E00\u6279\u63A8\u8350", children: [_jsx("svg", { className: `novel-recommend__refresh-icon ${spinId > 0 ? "is-spinning" : ""}`, viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: _jsx("path", { d: "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" }) }, spinId), _jsx("span", { children: "\u6362\u4E00\u6279" })] })) : null] }), _jsx("div", { className: "novel-recommend__scroll", role: "list", children: loading ? (_jsx(RecommendSkeleton, {})) : books.length === 0 ? null : (books.map((item) => (_jsx(RecommendCard, { item: item, onSelect: onSelect }, item.book.id)))) })] }));
}
function RecommendCard({ item, onSelect, }) {
    const { book, matchScore } = item;
    const clickable = typeof onSelect === "function";
    const cls = ["novel-recommend__card", clickable ? "is-clickable" : ""]
        .filter(Boolean)
        .join(" ");
    return (_jsxs("div", { className: cls, role: "listitem", tabIndex: clickable ? 0 : undefined, onClick: clickable ? () => onSelect?.(book) : undefined, onKeyDown: clickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(book);
                }
            }
            : undefined, "aria-label": `${book.title}，匹配度 ${matchScore}%`, children: [_jsxs("div", { className: "novel-recommend__cover", children: [book.cover ? (_jsx("img", { src: book.cover, alt: book.title, loading: "lazy" })) : (_jsx("div", { className: "novel-recommend__cover-fallback", "aria-hidden": true, children: _jsx("span", { children: book.title.slice(0, 1) }) })), _jsxs("span", { className: "novel-recommend__match", children: [matchScore, "% \u5339\u914D"] })] }), _jsx("div", { className: "novel-recommend__name", title: book.title, children: book.title }), book.rating != null ? (_jsxs("div", { className: "novel-recommend__rating", "aria-label": `评分 ${book.rating}`, children: [_jsx(NovelMedal, { size: "sm", "aria-hidden": "true", className: "novel-recommend__star" }), _jsx("span", { className: "novel-recommend__rating-num", children: book.rating.toFixed(1) })] })) : null] }));
}
function RecommendSkeleton() {
    return (_jsx(_Fragment, { children: Array.from({ length: 5 }).map((_, i) => (_jsxs("div", { className: "novel-recommend__card is-skeleton", role: "status", "aria-label": "\u52A0\u8F7D\u4E2D", children: [_jsx("div", { className: "novel-recommend__cover novel-recommend__cover--skeleton" }), _jsx("div", { className: "novel-recommend__skeleton-line novel-recommend__skeleton-line--name" }), _jsx("div", { className: "novel-recommend__skeleton-line novel-recommend__skeleton-line--rating" })] }, i))) }));
}
//# sourceMappingURL=BookRecommend.js.map