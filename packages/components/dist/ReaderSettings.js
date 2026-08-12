import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* ============================================================
 * ReaderSettings · 03 §6.13
 * 阅读设置半屏面板：字号 / 行距 / 字体 / 主题 / 翻页 5 项
 *   - 从底部滑入 dur-normal 240ms ease-out
 *   - 实时生效，Esc/外击/下滑关闭，自动写 localStorage
 *   - focus trap + Tab 循环
 * ============================================================ */
import { useEffect, useRef } from "react";
/* ---------- 选项常量 ---------- */
const FONT_SIZE_OPTIONS = [14, 16, 18, 20, 22, 24];
const LINE_HEIGHT_OPTIONS = [
    { value: "compact", label: "紧凑" },
    { value: "standard", label: "标准" },
    { value: "loose", label: "宽松" },
];
const FONT_FAMILY_OPTIONS = [
    { value: "serif", label: "默认" },
    { value: "song", label: "宋体" },
    { value: "hei", label: "黑体" },
    { value: "kai", label: "楷体" },
];
const THEME_OPTIONS = [
    {
        value: "day",
        label: "日间",
        bg: "var(--read-bg-day)",
        text: "var(--read-text-day)",
    },
    {
        value: "night",
        label: "夜间",
        bg: "var(--read-bg-night)",
        text: "var(--read-text-night)",
    },
    {
        value: "eye",
        label: "护眼",
        bg: "var(--read-bg-sepia)",
        text: "var(--read-text-sepia)",
    },
    {
        value: "parchment",
        label: "羊皮纸",
        bg: "var(--read-bg-parchment)",
        text: "var(--read-text-parchment)",
    },
];
const PAGE_MODE_OPTIONS = [
    { value: "scroll", label: "滚动" },
    { value: "slide", label: "滑动" },
    { value: "click", label: "点击" },
];
/* ============================================================
 * ReaderSettings
 * ============================================================ */
export function ReaderSettings({ settings, onChange, visible, onClose, className, }) {
    const panelRef = useRef(null);
    /* ---------- Esc 关闭 + focus trap ---------- */
    useEffect(() => {
        if (!visible)
            return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
            }
            if (e.key === "Tab" && panelRef.current) {
                const focusables = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusables.length === 0)
                    return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
                else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        // 打开时聚焦面板
        panelRef.current?.focus();
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [visible, onClose]);
    /* ---------- 主题切换 dur-instant 90ms（避免色彩流动） ---------- */
    const themeTransition = "background var(--dur-instant) var(--ease-standard), color var(--dur-instant) var(--ease-standard)";
    const updateField = (key, value) => {
        onChange({ ...settings, [key]: value });
    };
    const rootCls = [
        "novel-reader-settings",
        visible ? "is-visible" : "",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "novel-reader-settings__overlay", "aria-hidden": !visible, onClick: onClose, style: { display: visible ? "block" : "none" } }), _jsxs("div", { ref: panelRef, className: rootCls, role: "dialog", "aria-modal": "true", "aria-label": "\u9605\u8BFB\u8BBE\u7F6E", tabIndex: -1, children: [_jsx("div", { className: "novel-reader-settings__handle", "aria-hidden": true }), _jsxs("div", { className: "novel-reader-settings__body", children: [_jsx(SettingRow, { label: "\u5B57\u53F7", children: _jsxs("div", { className: "novel-reader-settings__font-size", children: [_jsx("button", { type: "button", className: "novel-reader-settings__step-btn", "aria-label": "\u51CF\u5C0F\u5B57\u53F7", disabled: settings.fontSize <= (FONT_SIZE_OPTIONS[0] ?? 0), onClick: () => {
                                                const idx = FONT_SIZE_OPTIONS.indexOf(settings.fontSize);
                                                if (idx > 0)
                                                    updateField("fontSize", FONT_SIZE_OPTIONS[idx - 1] ?? settings.fontSize);
                                            }, children: "A-" }), _jsx("input", { type: "range", className: "novel-reader-settings__slider", min: 0, max: FONT_SIZE_OPTIONS.length - 1, step: 1, value: FONT_SIZE_OPTIONS.indexOf(settings.fontSize), onChange: (e) => {
                                                const idx = Number(e.target.value);
                                                updateField("fontSize", FONT_SIZE_OPTIONS[idx] ?? settings.fontSize);
                                            }, "aria-label": "\u5B57\u53F7" }), _jsx("button", { type: "button", className: "novel-reader-settings__step-btn", "aria-label": "\u589E\u5927\u5B57\u53F7", disabled: settings.fontSize >=
                                                (FONT_SIZE_OPTIONS[FONT_SIZE_OPTIONS.length - 1] ??
                                                    settings.fontSize), onClick: () => {
                                                const idx = FONT_SIZE_OPTIONS.indexOf(settings.fontSize);
                                                if (idx < FONT_SIZE_OPTIONS.length - 1)
                                                    updateField("fontSize", FONT_SIZE_OPTIONS[idx + 1] ?? settings.fontSize);
                                            }, children: "A+" }), _jsx("span", { className: "novel-reader-settings__value", children: settings.fontSize })] }) }), _jsx(SettingRow, { label: "\u884C\u8DDD", children: _jsx(SegmentedControl, { options: LINE_HEIGHT_OPTIONS, value: settings.lineHeight, onChange: (v) => updateField("lineHeight", v), ariaLabel: "\u884C\u8DDD" }) }), _jsx(SettingRow, { label: "\u5B57\u4F53", children: _jsx(SegmentedControl, { options: FONT_FAMILY_OPTIONS, value: settings.fontFamily, onChange: (v) => updateField("fontFamily", v), ariaLabel: "\u5B57\u4F53" }) }), _jsx(SettingRow, { label: "\u7FFB\u9875", children: _jsx(SegmentedControl, { options: PAGE_MODE_OPTIONS, value: settings.pageMode, onChange: (v) => updateField("pageMode", v), ariaLabel: "\u7FFB\u9875\u65B9\u5F0F" }) }), _jsx(SettingRow, { label: "\u4E3B\u9898", children: _jsx("div", { className: "novel-reader-settings__themes", children: THEME_OPTIONS.map((opt) => (_jsx("button", { type: "button", className: [
                                            "novel-reader-settings__theme-swatch",
                                            settings.theme === opt.value ? "is-active" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" "), "aria-label": `${opt.label}主题`, "aria-pressed": settings.theme === opt.value, style: {
                                            background: opt.bg,
                                            color: opt.text,
                                            transition: themeTransition,
                                        }, onClick: () => updateField("theme", opt.value), children: _jsx("span", { className: "novel-reader-settings__theme-label", children: opt.label }) }, opt.value))) }) })] })] })] }));
}
/* ---------- 子组件：行标题 + 内容 ---------- */
function SettingRow({ label, children, }) {
    return (_jsxs("div", { className: "novel-reader-settings__row", children: [_jsx("div", { className: "novel-reader-settings__row-label", children: label }), _jsx("div", { className: "novel-reader-settings__row-content", children: children })] }));
}
function SegmentedControl({ options, value, onChange, ariaLabel, }) {
    return (_jsx("div", { className: "novel-reader-settings__segmented", role: "radiogroup", "aria-label": ariaLabel, children: options.map((opt) => (_jsx("button", { type: "button", role: "radio", "aria-checked": value === opt.value, className: [
                "novel-reader-settings__segment",
                value === opt.value ? "is-active" : "",
            ]
                .filter(Boolean)
                .join(" "), onClick: () => onChange(opt.value), children: opt.label }, opt.value))) }));
}
//# sourceMappingURL=ReaderSettings.js.map