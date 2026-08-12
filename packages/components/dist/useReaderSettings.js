/* ============================================================
 * useReaderSettings · 03 §6.13 / §4.6
 * 阅读设置状态管理 + localStorage 持久化
 *   - 字号 6 档：14 / 16 / 18 / 20 / 22 / 24
 *   - 行距 3 档：compact(1.5) / standard(1.8) / loose(2.1)
 *   - 字体 4 种：serif / song / hei / kai
 *   - 主题 4 套：day / night / eye / parchment
 *   - 翻页 3 式：slide / scroll / click
 * ============================================================ */
import { useCallback, useEffect, useState } from "react";
export const DEFAULT_READER_SETTINGS = {
    fontSize: 18,
    lineHeight: "standard",
    fontFamily: "serif",
    theme: "day",
    pageMode: "scroll",
};
const STORAGE_KEY_PREFIX = "reader-settings";
/** 行距语义值 → 数值（与 semantic.css 中变量对齐） */
export const LINE_HEIGHT_VALUE = {
    compact: 1.5,
    standard: 1.8,
    loose: 2.1,
};
/** 字体族 → CSS 变量引用（由 Reader 注入 --reader-font-family） */
export const FONT_FAMILY_VAR = {
    serif: "var(--reader-font-family-serif)",
    song: "var(--reader-font-family-song)",
    hei: "var(--reader-font-family-hei)",
    kai: "var(--reader-font-family-kai)",
};
/** 主题 → 4 个 L1 原始变量（由 Reader 注入 --novel-read-bg/text/secondary） */
export const THEME_VARS = {
    day: {
        bg: "var(--read-bg-day)",
        text: "var(--read-text-day)",
        secondary: "var(--read-text-secondary-day)",
    },
    night: {
        bg: "var(--read-bg-night)",
        text: "var(--read-text-night)",
        secondary: "var(--read-text-secondary-night)",
    },
    eye: {
        bg: "var(--read-bg-sepia)",
        text: "var(--read-text-sepia)",
        secondary: "var(--read-text-secondary-sepia)",
    },
    parchment: {
        bg: "var(--read-bg-parchment)",
        text: "var(--read-text-parchment)",
        secondary: "var(--read-text-secondary-parchment)",
    },
};
function readStorage(key) {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${key}`);
        if (raw == null)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function writeStorage(key, value) {
    try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}:${key}`, JSON.stringify(value));
    }
    catch {
        /* localStorage 不可用时静默降级（隐私模式） */
    }
}
export function useReaderSettings(initial) {
    const [settings, setSettings] = useState(() => {
        // 首次挂载从 localStorage 恢复；initial 作为兜底默认
        const merged = { ...DEFAULT_READER_SETTINGS, ...initial };
        Object.keys(merged).forEach((k) => {
            const stored = readStorage(k);
            if (stored != null)
                merged[k] = stored;
        });
        return merged;
    });
    // 写入持久化
    useEffect(() => {
        Object.keys(settings).forEach((k) => {
            writeStorage(k, settings[k]);
        });
    }, [settings]);
    const update = useCallback((key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    }, []);
    const updateAll = useCallback((next) => {
        setSettings((prev) => ({ ...prev, ...next }));
    }, []);
    const reset = useCallback(() => {
        setSettings(DEFAULT_READER_SETTINGS);
    }, []);
    return { settings, update, updateAll, reset };
}
//# sourceMappingURL=useReaderSettings.js.map