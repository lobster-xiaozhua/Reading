import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * Select · 02 §1.3
 * 单选 / 多选 / 搜索；键盘导航；远程 loading
 * 复用 Popper 的定位逻辑
 * ============================================================ */
import { useEffect, useMemo, useRef, useState } from "react";
import { Popper } from "./Popper.js";
import { NavigationChevronDown, NavigationClose, StatusSuccess, } from "@novel/icons";
const Chevron = ({ open }) => (_jsx("span", { style: {
        display: "inline-flex",
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform var(--dur-fast) var(--ease-standard)",
    }, children: _jsx(NavigationChevronDown, { size: "sm", "aria-hidden": "true" }) }));
const Check = () => _jsx(StatusSuccess, { size: "sm", "aria-hidden": "true" });
const Spin = () => _jsx("span", { className: "novel-select__spin", "aria-hidden": true });
export function Select({ value, options, multiple = false, searchable = false, loading = false, placeholder = "请选择", disabled = false, size = "md", onChange, renderTag, }) {
    const [open, setOpen] = useState(false);
    const [keyword, setKeyword] = useState("");
    const containerRef = useRef(null);
    const keywordRef = useRef(null);
    // 受控值统一为数组形式做内部处理
    const selectedArr = useMemo(() => {
        if (Array.isArray(value))
            return value;
        return value ? [value] : [];
    }, [value]);
    const optionMap = useMemo(() => {
        const m = new Map();
        options.forEach((o) => m.set(o.value, o));
        return m;
    }, [options]);
    const filtered = useMemo(() => {
        if (!searchable || !keyword.trim())
            return options;
        const kw = keyword.trim().toLowerCase();
        return options.filter((o) => {
            const label = typeof o.label === "string" ? o.label : String(o.value);
            return label.toLowerCase().includes(kw);
        });
    }, [options, keyword, searchable]);
    // 外部点击 / Esc 关闭
    useEffect(() => {
        if (!open)
            return;
        const onDoc = (e) => {
            if (containerRef.current &&
                !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onEsc = (e) => {
            if (e.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onEsc);
        };
    }, [open]);
    // 展开时聚焦搜索框
    useEffect(() => {
        if (open && searchable) {
            requestAnimationFrame(() => keywordRef.current?.focus());
        }
        else if (!open) {
            setKeyword("");
        }
    }, [open, searchable]);
    const isSelected = (v) => selectedArr.includes(v);
    const toggle = (v) => {
        if (multiple) {
            const next = isSelected(v)
                ? selectedArr.filter((x) => x !== v)
                : [...selectedArr, v];
            onChange?.(next);
        }
        else {
            onChange?.(v);
            setOpen(false);
        }
    };
    // 渲染选择器表面
    const renderSurface = () => {
        if (multiple) {
            if (selectedArr.length === 0) {
                return _jsx("span", { className: "novel-select__placeholder", children: placeholder });
            }
            return (_jsx("span", { className: "novel-select__tags", children: selectedArr.map((v) => {
                    const opt = optionMap.get(v);
                    if (!opt)
                        return null;
                    return (_jsxs("span", { className: "novel-select__tag", children: [renderTag ? renderTag(opt) : opt.label, _jsx("button", { type: "button", className: "novel-select__tag-close", "aria-label": `移除 ${opt.value}`, onClick: (e) => {
                                    e.stopPropagation();
                                    toggle(v);
                                }, children: _jsx(NavigationClose, { size: "xs", "aria-hidden": "true" }) })] }, v));
                }) }));
        }
        // 单选
        if (selectedArr.length === 0) {
            return _jsx("span", { className: "novel-select__placeholder", children: placeholder });
        }
        const selected = selectedArr[0];
        const opt = optionMap.get(selected);
        return (_jsx("span", { className: "novel-select__value", children: opt?.label ?? selected }));
    };
    return (_jsx("div", { ref: containerRef, className: `novel-select novel-select--${size} ${disabled ? "is-disabled" : ""} ${open ? "is-open" : ""}`, children: _jsx(Popper, { open: open, placement: "bottomStart", offset: 4, trigger: _jsxs("button", { type: "button", className: "novel-select__selector", disabled: disabled, "aria-haspopup": "listbox", "aria-expanded": open, onClick: () => !disabled && setOpen((o) => !o), children: [_jsx("span", { className: "novel-select__surface", children: renderSurface() }), _jsx("span", { className: "novel-select__suffix", children: loading ? _jsx(Spin, {}) : _jsx(Chevron, { open: open }) })] }), children: ({ floatRef, floatStyle, ready }) => (_jsxs("div", { ref: floatRef, className: `novel-select__dropdown ${ready ? "is-ready" : ""}`, style: floatStyle, role: "listbox", children: [searchable ? (_jsx("div", { className: "novel-select__search", children: _jsx("input", { ref: keywordRef, type: "text", className: "novel-select__search-input", value: keyword, placeholder: "\u641C\u7D22", onChange: (e) => setKeyword(e.target.value), "aria-label": "\u641C\u7D22\u9009\u9879" }) })) : null, _jsx("div", { className: "novel-select__options", children: loading ? (_jsx("div", { className: "novel-select__loading", children: "\u52A0\u8F7D\u4E2D\u2026" })) : filtered.length === 0 ? (_jsx("div", { className: "novel-select__empty", children: "\u65E0\u5339\u914D\u9879" })) : (filtered.map((opt) => {
                            const selected = isSelected(opt.value);
                            return (_jsxs("button", { type: "button", role: "option", "aria-selected": selected, className: [
                                    "novel-select__option",
                                    selected ? "is-selected" : "",
                                    opt.disabled ? "is-disabled" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" "), disabled: opt.disabled, onClick: () => !opt.disabled && toggle(opt.value), children: [_jsx("span", { className: "novel-select__option-label", children: opt.label }), selected ? (_jsx("span", { className: "novel-select__option-check", children: _jsx(Check, {}) })) : null] }, opt.value));
                        })) })] })) }) }));
}
//# sourceMappingURL=Select.js.map