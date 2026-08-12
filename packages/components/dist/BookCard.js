import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * BookCard · 03 §6.1
 * 书籍卡片：grid / list / horizontal 三变体
 * 封面 3:4，hover scale(1.02)+sh-2，active scale(0.98)，loading 骨架
 * ============================================================ */
import { memo, useState } from "react";
import { Tag } from "./Tag.js";
import { RatingStars } from "./RatingStars.js";
/** size → 封面宽度 px（03 §6.1 规格：sm 80 / md 120 / lg 160） */
const COVER_WIDTH = {
    sm: 80,
    md: 120,
    lg: 160,
};
export const BookCard = memo(function BookCard({ book, variant = "grid", size = "md", showRating = true, showIntro, tags, loading = false, onClick, className, }) {
    const [coverError, setCoverError] = useState(false);
    if (loading)
        return (_jsx(BookCardSkeleton, { variant: variant, size: size, className: className }));
    const introVisible = showIntro ?? variant === "list";
    const finalTags = (tags ?? book.tags ?? []).slice(0, 3);
    const coverW = COVER_WIDTH[size];
    const handleClick = (e) => {
        onClick?.(book, e);
    };
    const handleKeyDown = (e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick(book, e);
        }
    };
    const rootCls = [
        "novel-book-card",
        `novel-book-card--${variant}`,
        `novel-book-card--${size}`,
        onClick ? "is-clickable" : "",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    const coverNode = (_jsxs("div", { className: "novel-book-card__cover", style: { width: variant === "grid" ? "100%" : `${coverW}px` }, children: [book.cover && !coverError ? (_jsx("img", { src: book.cover, alt: book.title, loading: "lazy", onError: () => setCoverError(true) })) : (_jsx("div", { className: "novel-book-card__cover-fallback", "aria-hidden": true, children: _jsx("span", { children: book.title.slice(0, 1) }) })), book.added ? (_jsx("span", { className: "novel-book-card__added", children: "\u5DF2\u52A0\u5165" })) : null, book.hasUpdate ? (_jsx("span", { className: "novel-book-card__update-dot", "aria-label": "\u6709\u66F4\u65B0" })) : null] }));
    const infoNode = (_jsxs("div", { className: "novel-book-card__info", children: [_jsx("div", { className: "novel-book-card__title", title: book.title, children: book.title }), variant !== "horizontal" ? (_jsx("div", { className: "novel-book-card__author", title: book.author, children: book.author })) : null, showRating && book.rating != null ? (_jsx(RatingStars, { value: book.rating, readonly: true, size: "sm", showValue: true })) : null, introVisible && book.intro ? (_jsx("div", { className: "novel-book-card__intro", children: book.intro })) : null, finalTags.length > 0 ? (_jsx("div", { className: "novel-book-card__tags", children: finalTags.map((t) => (_jsx(Tag, { color: "default", children: t }, t))) })) : null] }));
    return (_jsxs("article", { className: rootCls, role: onClick ? "button" : undefined, tabIndex: onClick ? 0 : undefined, onClick: handleClick, onKeyDown: handleKeyDown, "aria-label": `${book.title} ${book.author}`, children: [coverNode, infoNode] }));
});
/* ---------- 骨架屏 ---------- */
function BookCardSkeleton({ variant, size, className, }) {
    const coverW = COVER_WIDTH[size];
    return (_jsxs("div", { className: [
            "novel-book-card",
            `novel-book-card--${variant}`,
            `novel-book-card--${size}`,
            "is-skeleton",
            className ?? "",
        ]
            .filter(Boolean)
            .join(" "), role: "status", "aria-label": "\u52A0\u8F7D\u4E2D", children: [_jsx("div", { className: "novel-book-card__cover novel-book-card__cover--skeleton", style: { width: variant === "grid" ? "100%" : `${coverW}px` } }), _jsxs("div", { className: "novel-book-card__info", children: [_jsx("div", { className: "novel-book-card__skeleton-line novel-book-card__skeleton-line--title" }), _jsx("div", { className: "novel-book-card__skeleton-line novel-book-card__skeleton-line--author" }), _jsx("div", { className: "novel-book-card__skeleton-line novel-book-card__skeleton-line--short" })] })] }));
}
//# sourceMappingURL=BookCard.js.map