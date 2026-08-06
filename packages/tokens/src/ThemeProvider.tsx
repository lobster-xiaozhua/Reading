/* ============================================================
 * Atlas Design System · ThemeProvider
 * - UI 主题：light / dark / system（跟随 prefers-color-scheme）
 * - 阅读主题：day / night / sepia / parchment（独立于 UI 主题）
 * - 持久化到 localStorage，SSR 安全
 * Source: 01-前端底层设计.md §12 / 03-C端专项设计.md §3.4
 * ============================================================ */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* ---------- 类型 ---------- */

export type UITheme = "light" | "dark" | "system";
export type ResolvedUITheme = "light" | "dark";
export type ReaderTheme = "day" | "night" | "sepia" | "parchment";

export interface ThemeContextValue {
  /** 用户设置的 UI 主题（含 system） */
  uiTheme: UITheme;
  /** 实际生效的 UI 主题（system 已解析为 light/dark） */
  resolvedUITheme: ResolvedUITheme;
  /** 阅读主题 */
  readerTheme: ReaderTheme;
  setUITheme: (theme: UITheme) => void;
  setReaderTheme: (theme: ReaderTheme) => void;
}

/* ---------- 常量 ---------- */

const UI_THEME_STORAGE_KEY = "novel:ui-theme";
const READER_THEME_STORAGE_KEY = "novel:reader-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

/* ---------- 工具 ---------- */

const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

function getSystemTheme(): ResolvedUITheme {
  if (!isBrowser) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredUITheme(): UITheme {
  if (!isBrowser) return "system";
  const v = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function readStoredReaderTheme(): ReaderTheme {
  if (!isBrowser) return "day";
  const v = window.localStorage.getItem(READER_THEME_STORAGE_KEY);
  return v === "day" || v === "night" || v === "sepia" || v === "parchment"
    ? v
    : "day";
}

function applyUITheme(resolved: ResolvedUITheme): void {
  if (!isBrowser) return;
  document.documentElement.setAttribute("data-theme", resolved);
}

function applyReaderTheme(theme: ReaderTheme): void {
  if (!isBrowser) return;
  document.documentElement.setAttribute("data-reader-theme", theme);
}

/* ---------- Provider ---------- */

export interface ThemeProviderProps {
  /** 初始 UI 主题，默认 system（SSR 阶段使用） */
  defaultUITheme?: UITheme;
  /** 初始阅读主题，默认 day */
  defaultReaderTheme?: ReaderTheme;
  children: ReactNode;
}

export function ThemeProvider({
  defaultUITheme = "system",
  defaultReaderTheme = "day",
  children,
}: ThemeProviderProps) {
  const [uiTheme, setUIThemeState] = useState<UITheme>(defaultUITheme);
  const [readerTheme, setReaderThemeState] =
    useState<ReaderTheme>(defaultReaderTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedUITheme>("light");

  /* 挂载时从 localStorage 读取并订阅系统主题变化 */
  useEffect(() => {
    setUIThemeState(readStoredUITheme());
    setReaderThemeState(readStoredReaderTheme());
    setSystemTheme(getSystemTheme());

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolvedUITheme: ResolvedUITheme =
    uiTheme === "system" ? systemTheme : uiTheme;

  /* 应用 UI 主题到 <html data-theme> */
  useEffect(() => {
    applyUITheme(resolvedUITheme);
  }, [resolvedUITheme]);

  /* 应用阅读主题到 <html data-reader-theme> */
  useEffect(() => {
    applyReaderTheme(readerTheme);
  }, [readerTheme]);

  const setUITheme = (theme: UITheme) => {
    setUIThemeState(theme);
    if (isBrowser) window.localStorage.setItem(UI_THEME_STORAGE_KEY, theme);
  };

  const setReaderTheme = (theme: ReaderTheme) => {
    setReaderThemeState(theme);
    if (isBrowser) window.localStorage.setItem(READER_THEME_STORAGE_KEY, theme);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      uiTheme,
      resolvedUITheme,
      readerTheme,
      setUITheme,
      setReaderTheme,
    }),
    [uiTheme, resolvedUITheme, readerTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/* ---------- Hooks ---------- */

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme 必须在 <ThemeProvider> 内使用");
  }
  return ctx;
}

export function useReaderTheme(): {
  readerTheme: ReaderTheme;
  setReaderTheme: (theme: ReaderTheme) => void;
} {
  const { readerTheme, setReaderTheme } = useTheme();
  return { readerTheme, setReaderTheme };
}
