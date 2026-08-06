/* ============================================================
 * ReaderSettings · 03 §6.13
 * 阅读设置半屏面板：字号 / 行距 / 字体 / 主题 / 翻页 5 项
 *   - 从底部滑入 dur-normal 240ms ease-out
 *   - 实时生效，Esc/外击/下滑关闭，自动写 localStorage
 *   - focus trap + Tab 循环
 * ============================================================ */

import { useEffect, useRef, type ReactNode } from "react";
import {
  type ReaderSettings as ReaderSettingsValue,
  type ReaderFontSize,
  type ReaderLineHeight,
  type ReaderFontFamily,
  type ReaderTheme,
  type ReaderPageMode,
} from "./useReaderSettings.js";

export interface ReaderSettingsProps {
  settings: ReaderSettingsValue;
  onChange: (next: ReaderSettingsValue) => void;
  visible: boolean;
  onClose: () => void;
  className?: string;
}

/* ---------- 选项常量 ---------- */

const FONT_SIZE_OPTIONS: ReaderFontSize[] = [14, 16, 18, 20, 22, 24];

const LINE_HEIGHT_OPTIONS: { value: ReaderLineHeight; label: string }[] = [
  { value: "compact", label: "紧凑" },
  { value: "standard", label: "标准" },
  { value: "loose", label: "宽松" },
];

const FONT_FAMILY_OPTIONS: { value: ReaderFontFamily; label: string }[] = [
  { value: "serif", label: "默认" },
  { value: "song", label: "宋体" },
  { value: "hei", label: "黑体" },
  { value: "kai", label: "楷体" },
];

const THEME_OPTIONS: {
  value: ReaderTheme;
  label: string;
  bg: string;
  text: string;
}[] = [
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

const PAGE_MODE_OPTIONS: { value: ReaderPageMode; label: string }[] = [
  { value: "scroll", label: "滚动" },
  { value: "slide", label: "滑动" },
  { value: "click", label: "点击" },
];

/* ============================================================
 * ReaderSettings
 * ============================================================ */

export function ReaderSettings({
  settings,
  onChange,
  visible,
  onClose,
  className,
}: ReaderSettingsProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Esc 关闭 + focus trap ---------- */
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
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
  const themeTransition =
    "background var(--dur-instant) var(--ease-standard), color var(--dur-instant) var(--ease-standard)";

  const updateField = <K extends keyof ReaderSettingsValue>(
    key: K,
    value: ReaderSettingsValue[K],
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const rootCls = [
    "novel-reader-settings",
    visible ? "is-visible" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* 遮罩 */}
      <div
        className="novel-reader-settings__overlay"
        aria-hidden={!visible}
        onClick={onClose}
        style={{ display: visible ? "block" : "none" }}
      />
      {/* 面板 */}
      <div
        ref={panelRef}
        className={rootCls}
        role="dialog"
        aria-modal="true"
        aria-label="阅读设置"
        tabIndex={-1}
      >
        <div className="novel-reader-settings__handle" aria-hidden />
        <div className="novel-reader-settings__body">
          {/* 字号：A- 滑块 A+ 三件式 */}
          <SettingRow label="字号">
            <div className="novel-reader-settings__font-size">
              <button
                type="button"
                className="novel-reader-settings__step-btn"
                aria-label="减小字号"
                disabled={settings.fontSize <= (FONT_SIZE_OPTIONS[0] ?? 0)}
                onClick={() => {
                  const idx = FONT_SIZE_OPTIONS.indexOf(settings.fontSize);
                  if (idx > 0)
                    updateField(
                      "fontSize",
                      FONT_SIZE_OPTIONS[idx - 1] ?? settings.fontSize,
                    );
                }}
              >
                A-
              </button>
              <input
                type="range"
                className="novel-reader-settings__slider"
                min={0}
                max={FONT_SIZE_OPTIONS.length - 1}
                step={1}
                value={FONT_SIZE_OPTIONS.indexOf(settings.fontSize)}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  updateField(
                    "fontSize",
                    FONT_SIZE_OPTIONS[idx] ?? settings.fontSize,
                  );
                }}
                aria-label="字号"
              />
              <button
                type="button"
                className="novel-reader-settings__step-btn"
                aria-label="增大字号"
                disabled={
                  settings.fontSize >=
                  (FONT_SIZE_OPTIONS[FONT_SIZE_OPTIONS.length - 1] ??
                    settings.fontSize)
                }
                onClick={() => {
                  const idx = FONT_SIZE_OPTIONS.indexOf(settings.fontSize);
                  if (idx < FONT_SIZE_OPTIONS.length - 1)
                    updateField(
                      "fontSize",
                      FONT_SIZE_OPTIONS[idx + 1] ?? settings.fontSize,
                    );
                }}
              >
                A+
              </button>
              <span className="novel-reader-settings__value">
                {settings.fontSize}
              </span>
            </div>
          </SettingRow>

          {/* 行距：分段 */}
          <SettingRow label="行距">
            <SegmentedControl
              options={LINE_HEIGHT_OPTIONS}
              value={settings.lineHeight}
              onChange={(v) => updateField("lineHeight", v)}
              ariaLabel="行距"
            />
          </SettingRow>

          {/* 字体：分段 */}
          <SettingRow label="字体">
            <SegmentedControl
              options={FONT_FAMILY_OPTIONS}
              value={settings.fontFamily}
              onChange={(v) => updateField("fontFamily", v)}
              ariaLabel="字体"
            />
          </SettingRow>

          {/* 翻页：分段 */}
          <SettingRow label="翻页">
            <SegmentedControl
              options={PAGE_MODE_OPTIONS}
              value={settings.pageMode}
              onChange={(v) => updateField("pageMode", v)}
              ariaLabel="翻页方式"
            />
          </SettingRow>

          {/* 主题：四色块 */}
          <SettingRow label="主题">
            <div className="novel-reader-settings__themes">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={[
                    "novel-reader-settings__theme-swatch",
                    settings.theme === opt.value ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`${opt.label}主题`}
                  aria-pressed={settings.theme === opt.value}
                  style={{
                    background: opt.bg,
                    color: opt.text,
                    transition: themeTransition,
                  }}
                  onClick={() => updateField("theme", opt.value)}
                >
                  <span className="novel-reader-settings__theme-label">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </SettingRow>
        </div>
      </div>
    </>
  );
}

/* ---------- 子组件：行标题 + 内容 ---------- */

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="novel-reader-settings__row">
      <div className="novel-reader-settings__row-label">{label}</div>
      <div className="novel-reader-settings__row-content">{children}</div>
    </div>
  );
}

/* ---------- 子组件：分段控件 ---------- */

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="novel-reader-settings__segmented"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={[
            "novel-reader-settings__segment",
            value === opt.value ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
