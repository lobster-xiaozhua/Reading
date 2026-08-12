export type ReaderFontSize = 14 | 16 | 18 | 20 | 22 | 24;
export type ReaderLineHeight = "compact" | "standard" | "loose";
export type ReaderFontFamily = "serif" | "song" | "hei" | "kai";
export type ReaderTheme = "day" | "night" | "eye" | "parchment";
export type ReaderPageMode = "slide" | "scroll" | "click";
export interface ReaderSettings {
    fontSize: ReaderFontSize;
    lineHeight: ReaderLineHeight;
    fontFamily: ReaderFontFamily;
    theme: ReaderTheme;
    pageMode: ReaderPageMode;
}
export declare const DEFAULT_READER_SETTINGS: ReaderSettings;
/** 行距语义值 → 数值（与 semantic.css 中变量对齐） */
export declare const LINE_HEIGHT_VALUE: Record<ReaderLineHeight, number>;
/** 字体族 → CSS 变量引用（由 Reader 注入 --reader-font-family） */
export declare const FONT_FAMILY_VAR: Record<ReaderFontFamily, string>;
/** 主题 → 4 个 L1 原始变量（由 Reader 注入 --novel-read-bg/text/secondary） */
export declare const THEME_VARS: Record<ReaderTheme, {
    bg: string;
    text: string;
    secondary: string;
}>;
export interface UseReaderSettingsReturn {
    settings: ReaderSettings;
    /** 更新单项设置，自动持久化 */
    update: <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void;
    /** 批量更新 */
    updateAll: (next: Partial<ReaderSettings>) => void;
    /** 重置为默认 */
    reset: () => void;
}
export declare function useReaderSettings(initial?: Partial<ReaderSettings>): UseReaderSettingsReturn;
//# sourceMappingURL=useReaderSettings.d.ts.map