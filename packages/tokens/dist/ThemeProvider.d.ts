import { type ReactNode } from "react";
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
export interface ThemeProviderProps {
    /** 初始 UI 主题，默认 system（SSR 阶段使用） */
    defaultUITheme?: UITheme;
    /** 初始阅读主题，默认 day */
    defaultReaderTheme?: ReaderTheme;
    children: ReactNode;
}
export declare function ThemeProvider({ defaultUITheme, defaultReaderTheme, children, }: ThemeProviderProps): import("react").JSX.Element;
export declare function useTheme(): ThemeContextValue;
export declare function useReaderTheme(): {
    readerTheme: ReaderTheme;
    setReaderTheme: (theme: ReaderTheme) => void;
};
//# sourceMappingURL=ThemeProvider.d.ts.map