import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * Tabs · 02 §1.6
 * line / card 两种样式；键盘导航（← → Home End）
 * ============================================================ */
import { useEffect, useLayoutEffect, useRef, useState, } from "react";
export function Tabs({ activeKey, items, type = "line", size = "md", onChange, }) {
    const tabListRef = useRef(null);
    const activeTabRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState(null);
    // line 样式：底部指示条跟随激活项
    useLayoutEffect(() => {
        if (type !== "line") {
            setIndicatorStyle(null);
            return;
        }
        const el = activeTabRef.current;
        const list = tabListRef.current;
        if (!el || !list)
            return;
        const elRect = el.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        setIndicatorStyle({
            left: elRect.left - listRect.left + list.scrollLeft,
            width: elRect.width,
        });
    }, [activeKey, items, type]);
    // 激活项滚动到可视区
    useEffect(() => {
        const el = activeTabRef.current;
        if (!el)
            return;
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, [activeKey]);
    const onKeyDown = (e) => {
        const enabledKeys = items.filter((it) => !it.disabled).map((it) => it.key);
        if (enabledKeys.length === 0)
            return;
        const idx = enabledKeys.indexOf(activeKey);
        let next = idx;
        switch (e.key) {
            case "ArrowRight":
                next = (idx + 1) % enabledKeys.length;
                break;
            case "ArrowLeft":
                next = (idx - 1 + enabledKeys.length) % enabledKeys.length;
                break;
            case "Home":
                next = 0;
                break;
            case "End":
                next = enabledKeys.length - 1;
                break;
            default:
                return;
        }
        e.preventDefault();
        const nextKey = enabledKeys[next];
        onChange?.(nextKey);
        // 移动焦点
        requestAnimationFrame(() => {
            const list = tabListRef.current;
            if (!list)
                return;
            const btn = list.querySelector(`[data-tab-key="${nextKey}"]`);
            btn?.focus();
        });
    };
    const active = items.find((it) => it.key === activeKey);
    return (_jsxs("div", { className: `novel-tabs novel-tabs--${type} novel-tabs--${size}`, children: [_jsxs("div", { ref: tabListRef, className: "novel-tabs__nav", role: "tablist", "aria-orientation": "horizontal", onKeyDown: onKeyDown, children: [items.map((it) => {
                        const isActive = it.key === activeKey;
                        return (_jsx("button", { ref: isActive ? activeTabRef : undefined, type: "button", role: "tab", "data-tab-key": it.key, "aria-selected": isActive, "aria-disabled": it.disabled, tabIndex: isActive ? 0 : -1, className: `novel-tabs__tab ${isActive ? "is-active" : ""} ${it.disabled ? "is-disabled" : ""}`, disabled: it.disabled, onClick: () => !it.disabled && onChange?.(it.key), children: _jsx("span", { className: "novel-tabs__label", children: it.label }) }, it.key));
                    }), type === "line" && indicatorStyle ? (_jsx("span", { className: "novel-tabs__indicator", style: {
                            transform: `translateX(${indicatorStyle.left}px)`,
                            width: indicatorStyle.width,
                        }, "aria-hidden": true })) : null] }), _jsx("div", { className: "novel-tabs__content", role: "tabpanel", children: active?.children })] }));
}
//# sourceMappingURL=Tabs.js.map