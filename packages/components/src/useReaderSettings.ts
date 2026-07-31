/* ============================================================
 * useReaderSettings · 03 §6.13 / §4.6
 * 阅读设置状态管理 + localStorage 持久化
 *   - 字号 6 档：14 / 16 / 18 / 20 / 22 / 24
 *   - 行距 3 档：compact(1.5) / standard(1.8) / loose(2.1)
 *   - 字体 4 种：serif / song / hei / kai
 *   - 主题 4 套：day / night / eye / parchment
 *   - 翻页 3 式：slide / scroll / click
 * ============================================================ */

import { useCallback, useEffect, useState } from 'react';

export type ReaderFontSize = 14 | 16 | 18 | 20 | 22 | 24;
export type ReaderLineHeight = 'compact' | 'standard' | 'loose';
export type ReaderFontFamily = 'serif' | 'song' | 'hei' | 'kai';
export type ReaderTheme = 'day' | 'night' | 'eye' | 'parchment';
export type ReaderPageMode = 'slide' | 'scroll' | 'click';

export interface ReaderSettings {
  fontSize: ReaderFontSize;
  lineHeight: ReaderLineHeight;
  fontFamily: ReaderFontFamily;
  theme: ReaderTheme;
  pageMode: ReaderPageMode;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineHeight: 'standard',
  fontFamily: 'serif',
  theme: 'day',
  pageMode: 'scroll',
};

const STORAGE_KEY_PREFIX = 'reader-settings';

/** 行距语义值 → 数值（与 semantic.css 中变量对齐） */
export const LINE_HEIGHT_VALUE: Record<ReaderLineHeight, number> = {
  compact: 1.5,
  standard: 1.8,
  loose: 2.1,
};

/** 字体族 → CSS 变量引用（由 Reader 注入 --reader-font-family） */
export const FONT_FAMILY_VAR: Record<ReaderFontFamily, string> = {
  serif: 'var(--reader-font-family-serif)',
  song: 'var(--reader-font-family-song)',
  hei: 'var(--reader-font-family-hei)',
  kai: 'var(--reader-font-family-kai)',
};

/** 主题 → 4 个 L1 原始变量（由 Reader 注入 --novel-read-bg/text/secondary） */
export const THEME_VARS: Record<
  ReaderTheme,
  { bg: string; text: string; secondary: string }
> = {
  day: {
    bg: 'var(--read-bg-day)',
    text: 'var(--read-text-day)',
    secondary: 'var(--read-text-secondary-day)',
  },
  night: {
    bg: 'var(--read-bg-night)',
    text: 'var(--read-text-night)',
    secondary: 'var(--read-text-secondary-night)',
  },
  eye: {
    bg: 'var(--read-bg-sepia)',
    text: 'var(--read-text-sepia)',
    secondary: 'var(--read-text-secondary-sepia)',
  },
  parchment: {
    bg: 'var(--read-bg-parchment)',
    text: 'var(--read-text-parchment)',
    secondary: 'var(--read-text-secondary-parchment)',
  },
};

function readStorage<T extends keyof ReaderSettings>(
  key: T,
): ReaderSettings[T] | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${key}`);
    if (raw == null) return null;
    return JSON.parse(raw) as ReaderSettings[T];
  } catch {
    return null;
  }
}

function writeStorage<T extends keyof ReaderSettings>(
  key: T,
  value: ReaderSettings[T],
): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    /* localStorage 不可用时静默降级（隐私模式） */
  }
}

export interface UseReaderSettingsReturn {
  settings: ReaderSettings;
  /** 更新单项设置，自动持久化 */
  update: <K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K],
  ) => void;
  /** 批量更新 */
  updateAll: (next: Partial<ReaderSettings>) => void;
  /** 重置为默认 */
  reset: () => void;
}

export function useReaderSettings(
  initial?: Partial<ReaderSettings>,
): UseReaderSettingsReturn {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    // 首次挂载从 localStorage 恢复；initial 作为兜底默认
    const merged: ReaderSettings = { ...DEFAULT_READER_SETTINGS, ...initial };
    (Object.keys(merged) as (keyof ReaderSettings)[]).forEach((k) => {
      const stored = readStorage(k);
      if (stored != null) (merged as unknown as Record<string, unknown>)[k] = stored;
    });
    return merged;
  });

  // 写入持久化
  useEffect(() => {
    (Object.keys(settings) as (keyof ReaderSettings)[]).forEach((k) => {
      writeStorage(k, settings[k]);
    });
  }, [settings]);

  const update = useCallback<UseReaderSettingsReturn['update']>((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateAll = useCallback<UseReaderSettingsReturn['updateAll']>((next) => {
    setSettings((prev) => ({ ...prev, ...next }));
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_READER_SETTINGS);
  }, []);

  return { settings, update, updateAll, reset };
}
