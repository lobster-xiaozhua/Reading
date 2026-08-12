import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * Atlas Design System · ThemeProvider
 * - UI 主题：light / dark / system（跟随 prefers-color-scheme）
 * - 阅读主题：day / night / sepia / parchment（独立于 UI 主题）
 * - 持久化到 localStorage，SSR 安全
 * Source: 01-前端底层设计.md §12 / 03-C端专项设计.md §3.4
 * ============================================================ */
import { createContext, useContext, useEffect, useMemo, useState, } from "react";
/* ---------- 常量 ---------- */
const UI_THEME_STORAGE_KEY = "novel:ui-theme";
const READER_THEME_STORAGE_KEY = "novel:reader-theme";
const ThemeContext = createContext(null);
/* ---------- 工具 ---------- */
const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
function getSystemTheme() {
    if (!isBrowser)
        return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}
function readStoredUITheme() {
    if (!isBrowser)
        return "system";
    const v = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
}
function readStoredReaderTheme() {
    if (!isBrowser)
        return "day";
    const v = window.localStorage.getItem(READER_THEME_STORAGE_KEY);
    return v === "day" || v === "night" || v === "sepia" || v === "parchment"
        ? v
        : "day";
}
function applyUITheme(resolved) {
    if (!isBrowser)
        return;
    document.documentElement.setAttribute("data-theme", resolved);
}
function applyReaderTheme(theme) {
    if (!isBrowser)
        return;
    document.documentElement.setAttribute("data-reader-theme", theme);
}
export function ThemeProvider({ defaultUITheme = "system", defaultReaderTheme = "day", children, }) {
    const [uiTheme, setUIThemeState] = useState(defaultUITheme);
    const [readerTheme, setReaderThemeState] = useState(defaultReaderTheme);
    const [systemTheme, setSystemTheme] = useState("light");
    /* 挂载时从 localStorage 读取并订阅系统主题变化 */
    useEffect(() => {
        setUIThemeState(readStoredUITheme());
        setReaderThemeState(readStoredReaderTheme());
        setSystemTheme(getSystemTheme());
        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = (e) => {
            setSystemTheme(e.matches ? "dark" : "light");
        };
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);
    const resolvedUITheme = uiTheme === "system" ? systemTheme : uiTheme;
    /* 应用 UI 主题到 <html data-theme> */
    useEffect(() => {
        applyUITheme(resolvedUITheme);
    }, [resolvedUITheme]);
    /* 应用阅读主题到 <html data-reader-theme> */
    useEffect(() => {
        applyReaderTheme(readerTheme);
    }, [readerTheme]);
    const setUITheme = (theme) => {
        setUIThemeState(theme);
        if (isBrowser)
            window.localStorage.setItem(UI_THEME_STORAGE_KEY, theme);
    };
    const setReaderTheme = (theme) => {
        setReaderThemeState(theme);
        if (isBrowser)
            window.localStorage.setItem(READER_THEME_STORAGE_KEY, theme);
    };
    const value = useMemo(() => ({
        uiTheme,
        resolvedUITheme,
        readerTheme,
        setUITheme,
        setReaderTheme,
    }), [uiTheme, resolvedUITheme, readerTheme]);
    return (_jsx(ThemeContext.Provider, { value: value, children: children }));
}
/* ---------- Hooks ---------- */
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error("useTheme 必须在 <ThemeProvider> 内使用");
    }
    return ctx;
}
export function useReaderTheme() {
    const { readerTheme, setReaderTheme } = useTheme();
    return { readerTheme, setReaderTheme };
}
//# sourceMappingURL=ThemeProvider.js.map