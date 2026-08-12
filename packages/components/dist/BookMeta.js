import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tag } from "./Tag.js";
import { ContentStatus } from "./ContentStatus.js";
/** 字数格式化：<1万 显示原值；1万~1亿 显示「X.X万」；≥1亿 显示「X.X亿」 */
function formatWordCount(n) {
    if (n < 10000)
        return `${n}`;
    if (n < 100000000) {
        const wan = n / 10000;
        return `${wan.toFixed(wan >= 100 ? 0 : 1)}万`;
    }
    const yi = n / 100000000;
    return `${yi.toFixed(yi >= 100 ? 0 : 1)}亿`;
}
/** 时间相对化：刚刚 / N 分钟前 / N 小时前 / N 天前 / 超过 30 天显示日期 */
function formatRelative(input) {
    const date = input instanceof Date ? input : new Date(input);
    const now = Date.now();
    const diff = now - date.getTime();
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
    // 超过 30 天显示 YYYY-MM-DD
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
const Separator = () => _jsx("span", { className: "book-meta__stats-separator", children: "\u00B7" });
export function BookMeta({ title, author, wordCount, chapterCount, status, updatedAt, tags, size = "detailed", onClick, }) {
    const isCompact = size === "compact";
    // 统计行内容
    const stats = [];
    if (wordCount != null)
        stats.push(`${formatWordCount(wordCount)} 字`);
    if (chapterCount != null)
        stats.push(`${chapterCount} 章`);
    const updatedText = updatedAt != null ? formatRelative(updatedAt) : "";
    if (updatedText)
        stats.push(updatedText);
    const titleNode = (_jsx("span", { className: "book-meta__title", title: title, role: onClick ? "button" : undefined, tabIndex: onClick ? 0 : undefined, onClick: onClick, onKeyDown: (e) => {
            if (onClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onClick(e);
            }
        }, children: title }));
    return (_jsxs("div", { className: `book-meta book-meta--${size}`, children: [_jsxs("div", { className: "book-meta__title-row", children: [titleNode, status ? (_jsx(ContentStatus, { status: status, size: isCompact ? "sm" : "md" })) : null] }), !isCompact ? (_jsx("div", { className: "book-meta__author", title: author, children: author })) : null, stats.length > 0 ? (_jsx("div", { className: "book-meta__stats", children: stats.map((s, i) => (_jsxs("span", { className: "book-meta__stat", children: [i > 0 ? _jsx(Separator, {}) : null, s] }, i))) })) : null, !isCompact && tags && tags.length > 0 ? (_jsx("div", { className: "book-meta__tags", children: tags.map((t) => (_jsx(Tag, { color: "default", children: t }, t))) })) : null] }));
}
//# sourceMappingURL=BookMeta.js.map