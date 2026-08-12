import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * Bookshelf · 03 §6.5
 * 书架组件：grid/list 视图；分组排序；追更红点；空状态
 * 规格：
 *   - grid：响应式列数 xs2 / sm3 / md4 / lg5 / xl6
 *   - list：单列，含封面 + 书名 + 阅读进度 + 上次阅读时间
 *   - 分组标题 font-sans 14px text-secondary uppercase
 *   - 排序/视图切换控件置于右上角，icon-only
 *   - 书籍有更新时封面右上角 8px rose 红点（BookCard hasUpdate 已支持）
 * ============================================================ */
import { useMemo, useState } from "react";
import { BookCard } from "./BookCard.js";
import { EmptyState } from "./EmptyState.js";
import { NotificationBadge } from "./NotificationBadge.js";
import { ContentCategory, NavigationMenu, ActionSort } from "@novel/icons";
function filterByTab(books, tabKey) {
    switch (tabKey) {
        case "ongoing":
            return books.filter((b) => b.status === "ongoing");
        case "finished":
            return books.filter((b) => b.status === "completed");
        case "recent":
            return books.filter((b) => b.lastReadTime != null);
        case "all":
        default:
            return books;
    }
}
function sortBooks(books, sortBy) {
    const arr = [...books];
    switch (sortBy) {
        case "title":
            return arr.sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
        case "update":
            return arr.sort((a, b) => (b.updateTime ?? 0) - (a.updateTime ?? 0));
        case "recent":
        default:
            return arr.sort((a, b) => (b.lastReadTime ?? 0) - (a.lastReadTime ?? 0));
    }
}
const STATUS_GROUP_LABEL = {
    ongoing: "连载中",
    completed: "已完结",
    paused: "暂停更新",
    reviewing: "审核中",
    offline: "已下架",
    __unknown: "其他",
};
function groupBooks(books, groupBy) {
    if (groupBy === "none") {
        return [{ key: "__all", label: "", books }];
    }
    const map = new Map();
    for (const b of books) {
        let groupKey;
        let label;
        if (groupBy === "status") {
            groupKey = b.status ?? "__unknown";
            label =
                STATUS_GROUP_LABEL[groupKey] ??
                    STATUS_GROUP_LABEL.__unknown ??
                    "未分类";
        }
        else {
            // tag：按第一个 tag 分组；无 tag 归「未分类」
            const t = b.tags?.[0];
            groupKey = t ?? "__untagged";
            label = t ?? "未分类";
        }
        if (!map.has(groupKey)) {
            map.set(groupKey, { key: groupKey, label, books: [] });
        }
        map.get(groupKey).books.push(b);
    }
    // status 分组按固定顺序输出；tag 按首次出现顺序
    if (groupBy === "status") {
        const order = [
            "ongoing",
            "completed",
            "paused",
            "reviewing",
            "offline",
            "__unknown",
        ];
        return order.filter((k) => map.has(k)).map((k) => map.get(k));
    }
    return Array.from(map.values());
}
/* ---------- 图标（icon-only 控件） ---------- */
function GroupIcon() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "4", rx: "1" }), _jsx("rect", { x: "3", y: "12", width: "18", height: "4", rx: "1", opacity: "0.55" }), _jsx("rect", { x: "3", y: "20", width: "18", height: "0.5" })] }));
}
function ChevronIcon({ open }) {
    return (_jsx("svg", { viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, style: {
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform var(--dur-fast) var(--ease-standard)",
        }, children: _jsx("path", { d: "M9 6l6 6-6 6" }) }));
}
/* ---------- 排序/分组下拉菜单 ---------- */
const SORT_OPTIONS = [
    { value: "recent", label: "最近阅读" },
    { value: "update", label: "最近更新" },
    { value: "title", label: "书名" },
];
const GROUP_OPTIONS = [
    { value: "none", label: "不分组" },
    { value: "status", label: "按状态" },
    { value: "tag", label: "按标签" },
];
/* ============================================================
 * Bookshelf 主组件
 * ============================================================ */
export function Bookshelf({ books, groupBy: groupByProp, sortBy: sortByProp, viewMode: viewModeProp, tabs, activeTab: activeTabProp, onTabChange, onGroupByChange, onSortByChange, onViewModeChange, onUpdate, onBookClick, loading = false, emptyAction, className, }) {
    /* 受控/非受控：未传 prop 时使用内部状态 */
    const [internalGroupBy, setInternalGroupBy] = useState("none");
    const [internalSortBy, setInternalSortBy] = useState("recent");
    const [internalViewMode, setInternalViewMode] = useState("grid");
    const [internalActiveTab, setInternalActiveTab] = useState(tabs?.[0]?.key ?? "all");
    const groupBy = groupByProp ?? internalGroupBy;
    const sortBy = sortByProp ?? internalSortBy;
    const viewMode = viewModeProp ?? internalViewMode;
    const activeTab = activeTabProp ?? internalActiveTab;
    const setGroupBy = (v) => {
        if (groupByProp == null)
            setInternalGroupBy(v);
        onGroupByChange?.(v);
    };
    const setSortBy = (v) => {
        if (sortByProp == null)
            setInternalSortBy(v);
        onSortByChange?.(v);
    };
    const setViewMode = (v) => {
        if (viewModeProp == null)
            setInternalViewMode(v);
        onViewModeChange?.(v);
    };
    const setActiveTab = (v) => {
        if (activeTabProp == null)
            setInternalActiveTab(v);
        onTabChange?.(v);
    };
    /* 分组折叠态：仅 groupBy !== 'none' 时生效 */
    const [collapsed, setCollapsed] = useState(new Set());
    const toggleGroup = (key) => {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(key))
                next.delete(key);
            else
                next.add(key);
            return next;
        });
    };
    /* 过滤 → 排序 → 分组 */
    const groups = useMemo(() => {
        const filtered = filterByTab(books, activeTab);
        const sorted = sortBooks(filtered, sortBy);
        return groupBooks(sorted, groupBy);
    }, [books, activeTab, sortBy, groupBy]);
    /* 有更新的书籍（顶部 NotificationBadge 聚合提示） */
    const updateCount = useMemo(() => books.filter((b) => b.hasUpdate).length, [books]);
    /* 最近一条更新通知（单条模式） */
    const latestUpdate = useMemo(() => {
        const updated = books.filter((b) => b.hasUpdate);
        if (updated.length === 0)
            return null;
        return updated.reduce((max, b) => (b.updateTime ?? 0) > (max.updateTime ?? 0) ? b : max);
    }, [books]);
    const rootCls = [
        "novel-bookshelf",
        `novel-bookshelf--${viewMode}`,
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    /* ---------- loading 骨架 ---------- */
    if (loading) {
        return (_jsxs("div", { className: rootCls, children: [_jsx(BookshelfToolbar, { tabs: tabs, activeTab: activeTab, onTabChange: setActiveTab, groupBy: groupBy, sortBy: sortBy, viewMode: viewMode, onGroupByChange: setGroupBy, onSortByChange: setSortBy, onViewModeChange: setViewMode }), _jsx("div", { className: "novel-bookshelf__grid", role: "status", "aria-label": "\u52A0\u8F7D\u4E2D", children: Array.from({ length: 12 }).map((_, i) => (_jsx(BookCard, { book: EMPTY_BOOK, variant: "grid", size: "md", loading: true }, i))) })] }));
    }
    /* ---------- 空书架 ---------- */
    if (books.length === 0) {
        return (_jsxs("div", { className: rootCls, children: [_jsx(BookshelfToolbar, { tabs: tabs, activeTab: activeTab, onTabChange: setActiveTab, groupBy: groupBy, sortBy: sortBy, viewMode: viewMode, onGroupByChange: setGroupBy, onSortByChange: setSortBy, onViewModeChange: setViewMode }), _jsx("div", { className: "novel-bookshelf__empty", children: _jsx(EmptyState, { title: "\u4E66\u67B6\u7A7A\u7A7A\u5982\u4E5F", description: "\u628A\u4F60\u559C\u6B22\u7684\u4E66\u52A0\u5165\u4E66\u67B6\uFF0C\u968F\u65F6\u63A5\u7740\u8BFB", action: emptyAction ?? _jsx(DefaultDiscoverAction, {}) }) })] }));
    }
    /* ---------- 正常渲染 ---------- */
    return (_jsxs("div", { className: rootCls, children: [_jsx(BookshelfToolbar, { tabs: tabs, activeTab: activeTab, onTabChange: setActiveTab, groupBy: groupBy, sortBy: sortBy, viewMode: viewMode, onGroupByChange: setGroupBy, onSortByChange: setSortBy, onViewModeChange: setViewMode }), updateCount > 0 ? (_jsx("div", { className: "novel-bookshelf__notify", children: updateCount >= 3 ? (_jsx(NotificationBadge, { aggregateCount: updateCount, onClick: () => setActiveTab("recent") })) : latestUpdate ? (_jsx(NotificationBadge, { novelTitle: latestUpdate.title, chapterCount: latestUpdate.unreadChapters ?? 0, updateTime: latestUpdate.updateTime, read: false, onClick: () => onBookClick?.(latestUpdate, {}) })) : null })) : null, _jsx("div", { className: "novel-bookshelf__body", children: groups.map((g) => {
                    const isCollapsed = collapsed.has(g.key);
                    return (_jsxs("section", { className: "novel-bookshelf__group", children: [groupBy !== "none" ? (_jsxs("button", { type: "button", className: "novel-bookshelf__group-header", onClick: () => toggleGroup(g.key), "aria-expanded": !isCollapsed, "aria-label": `${g.label} 分组，${isCollapsed ? "展开" : "折叠"}`, children: [_jsx(ChevronIcon, { open: !isCollapsed }), _jsx("span", { className: "novel-bookshelf__group-title", children: g.label }), _jsx("span", { className: "novel-bookshelf__group-count", children: g.books.length })] })) : null, !isCollapsed ? (viewMode === "grid" ? (_jsx("div", { className: "novel-bookshelf__grid", children: g.books.map((b) => (_jsx(BookCard, { book: b, variant: "grid", size: "md", showRating: false, onClick: onBookClick }, b.id))) })) : (_jsx("ul", { className: "novel-bookshelf__list", children: g.books.map((b) => (_jsxs("li", { className: "novel-bookshelf__list-item", children: [_jsx(BookCard, { book: b, variant: "list", size: "sm", showRating: false, onClick: onBookClick }), _jsx(ShelfBookMeta, { book: b, onUpdate: onUpdate, books: books })] }, b.id))) }))) : null] }, g.key));
                }) })] }));
}
/* ---------- 书架内书籍元信息（list 视图：进度 + 上次阅读 + 移除） ---------- */
function ShelfBookMeta({ book, books, onUpdate, }) {
    const hasProgress = book.progress != null && book.progress > 0;
    const hasLastRead = book.lastReadTime != null;
    const handleRemove = () => {
        if (!onUpdate)
            return;
        onUpdate(books.filter((b) => b.id !== book.id));
    };
    return (_jsxs("div", { className: "novel-bookshelf__meta", children: [hasProgress ? (_jsxs("div", { className: "novel-bookshelf__progress", children: [_jsx("div", { className: "novel-bookshelf__progress-bar", children: _jsx("div", { className: "novel-bookshelf__progress-fill", style: {
                                width: `${Math.min(100, Math.round((book.progress ?? 0) * 100))}%`,
                            } }) }), _jsxs("span", { className: "novel-bookshelf__progress-text", children: [Math.round((book.progress ?? 0) * 100), "%"] })] })) : null, hasLastRead ? (_jsxs("span", { className: "novel-bookshelf__last-read", children: ["\u4E0A\u6B21\u9605\u8BFB ", formatRelativeShort(book.lastReadTime)] })) : null, onUpdate ? (_jsx("button", { type: "button", className: "novel-bookshelf__remove", "aria-label": `将《${book.title}》移出书架`, onClick: handleRemove, children: "\u79FB\u51FA" })) : null] }));
}
/* ---------- 工具栏（Tab + 排序/分组/视图切换） ---------- */
function BookshelfToolbar({ tabs, activeTab, onTabChange, groupBy, sortBy, viewMode, onGroupByChange, onSortByChange, onViewModeChange, }) {
    return (_jsxs("div", { className: "novel-bookshelf__toolbar", children: [tabs && tabs.length > 0 ? (_jsx("div", { className: "novel-bookshelf__tabs", role: "tablist", "aria-label": "\u4E66\u67B6\u8FC7\u6EE4", children: tabs.map((t) => (_jsx("button", { type: "button", role: "tab", "aria-selected": activeTab === t.key, className: [
                        "novel-bookshelf__tab",
                        activeTab === t.key ? "is-active" : "",
                    ]
                        .filter(Boolean)
                        .join(" "), onClick: () => onTabChange(t.key), children: t.label }, t.key))) })) : null, _jsxs("div", { className: "novel-bookshelf__controls", children: [_jsxs("label", { className: "novel-bookshelf__control", children: [_jsx("span", { className: "novel-bookshelf__control-icon", "aria-hidden": true, children: _jsx(ActionSort, { size: "lg", "aria-hidden": "true" }) }), _jsx("select", { className: "novel-bookshelf__select", value: sortBy, onChange: (e) => onSortByChange(e.target.value), "aria-label": "\u6392\u5E8F\u65B9\u5F0F", children: SORT_OPTIONS.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value))) })] }), _jsxs("label", { className: "novel-bookshelf__control", children: [_jsx("span", { className: "novel-bookshelf__control-icon", "aria-hidden": true, children: _jsx(GroupIcon, {}) }), _jsx("select", { className: "novel-bookshelf__select", value: groupBy, onChange: (e) => onGroupByChange(e.target.value), "aria-label": "\u5206\u7EC4\u65B9\u5F0F", children: GROUP_OPTIONS.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value))) })] }), _jsxs("div", { className: "novel-bookshelf__view-toggle", role: "group", "aria-label": "\u89C6\u56FE\u5207\u6362", children: [_jsx("button", { type: "button", className: [
                                    "novel-bookshelf__view-btn",
                                    viewMode === "grid" ? "is-active" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" "), onClick: () => onViewModeChange("grid"), "aria-label": "\u7F51\u683C\u89C6\u56FE", "aria-pressed": viewMode === "grid", children: _jsx(ContentCategory, { size: "lg", "aria-hidden": "true" }) }), _jsx("button", { type: "button", className: [
                                    "novel-bookshelf__view-btn",
                                    viewMode === "list" ? "is-active" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" "), onClick: () => onViewModeChange("list"), "aria-label": "\u5217\u8868\u89C6\u56FE", "aria-pressed": viewMode === "list", children: _jsx(NavigationMenu, { size: "lg", "aria-hidden": "true" }) })] })] })] }));
}
function DefaultDiscoverAction() {
    return (_jsx("a", { className: "novel-bookshelf__discover-btn", href: "/", children: "\u53BB\u53D1\u73B0\u597D\u4E66" }));
}
/* ---------- 工具：相对时间（简版，与 NotificationBadge 对齐） ---------- */
function formatRelativeShort(input) {
    const diff = Date.now() - input;
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
    const date = new Date(input);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
/* 骨架屏占位用的空 Book */
const EMPTY_BOOK = { id: "", title: "", author: "" };
//# sourceMappingURL=Bookshelf.js.map