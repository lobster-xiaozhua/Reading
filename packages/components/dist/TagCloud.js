import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * TagCloud · P6 §2
 * 标签云：cloud（pill，字号随 count 映射）/ list（行式）两变体
 * 热门 TOP3 加「热」暖橙标记；选中 brand 高亮
 * ============================================================ */
import { useMemo } from "react";
import { NovelFire } from "@novel/icons";
/** 按 count 占比分档字号（count 越大字越大） */
function sizeTier(ratio) {
    if (ratio >= 0.66)
        return "xl";
    if (ratio >= 0.33)
        return "md";
    return "sm";
}
export function TagCloud({ tags, sortBy = "count", maxCount = 30, variant = "cloud", selected = [], onSelect, className, }) {
    const { sorted, hotIds, maxC } = useMemo(() => {
        const arr = [...tags];
        if (sortBy === "count")
            arr.sort((a, b) => b.count - a.count);
        else
            arr.sort((a, b) => a.name.localeCompare(b.name, "zh"));
        const sliced = arr.slice(0, maxCount);
        const m = sliced.reduce((mx, t) => Math.max(mx, t.count), 1);
        const byCount = [...sliced].sort((a, b) => b.count - a.count);
        const hot = new Set(byCount.slice(0, 3).map((t) => t.id));
        return { sorted: sliced, hotIds: hot, maxC: m };
    }, [tags, sortBy, maxCount]);
    const rootCls = [
        "novel-tagcloud",
        `novel-tagcloud--${variant}`,
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    if (sorted.length === 0) {
        return _jsx("div", { className: rootCls, children: "\u6682\u65E0\u6807\u7B7E" });
    }
    return (_jsx("div", { className: rootCls, children: variant === "cloud" ? (_jsx("ul", { className: "novel-tagcloud__cloud", role: "list", children: sorted.map((t) => {
                const ratio = t.count / maxC;
                const tier = sizeTier(ratio);
                const isHot = hotIds.has(t.id);
                const isSelected = selected.includes(t.id);
                const cls = [
                    "novel-tagcloud__pill",
                    `novel-tagcloud__pill--${tier}`,
                    isHot ? "is-hot" : "",
                    isSelected ? "is-selected" : "",
                ]
                    .filter(Boolean)
                    .join(" ");
                return (_jsx("li", { role: "listitem", children: _jsxs("button", { type: "button", className: cls, "aria-pressed": isSelected, onClick: onSelect ? () => onSelect(t) : undefined, "aria-label": `${t.name}，${t.count} 本`, children: [isHot ? (_jsx(NovelFire, { size: "xs", "aria-hidden": "true", className: "novel-tagcloud__hot" })) : null, _jsx("span", { className: "novel-tagcloud__name", children: t.name }), _jsx("span", { className: "novel-tagcloud__count", children: t.count })] }) }, t.id));
            }) })) : (_jsx("ul", { className: "novel-tagcloud__listview", role: "list", children: sorted.map((t) => {
                const isSelected = selected.includes(t.id);
                const cls = [
                    "novel-tagcloud__item",
                    isSelected ? "is-selected" : "",
                ]
                    .filter(Boolean)
                    .join(" ");
                return (_jsx("li", { role: "listitem", className: cls, children: _jsxs("button", { type: "button", className: "novel-tagcloud__item-btn", "aria-pressed": isSelected, onClick: onSelect ? () => onSelect(t) : undefined, "aria-label": `${t.name}，${t.count} 本`, children: [_jsx("span", { className: "novel-tagcloud__name", children: t.name }), _jsx("span", { className: "novel-tagcloud__count", children: t.count })] }) }, t.id));
            }) })) }));
}
//# sourceMappingURL=TagCloud.js.map