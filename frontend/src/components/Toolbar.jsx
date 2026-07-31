import { useState } from "react";
import { Link } from "react-router-dom";

const THEMES = [
  { id: "night", label: "深夜" },
  { id: "light", label: "日间" },
  { id: "sepia", label: "羊皮纸" },
  { id: "green", label: "护眼" },
  { id: "gray", label: "素灰" },
  { id: "ink", label: "墨蓝" },
  { id: "paper", label: "纸黄" },
];

const FONTS = [
  { id: "system", label: "系统默认", css: "" },
  { id: "serif", label: "衬线", css: "'Georgia', 'Noto Serif SC', serif" },
  { id: "sans", label: "黑体", css: "'Noto Sans SC', 'PingFang SC', sans-serif" },
];

export default function Toolbar({
  theme,
  themeLabel,
  fontSize,
  progress,
  onCycleTheme,
  onOpenSettings,
  onOpenBookmarks,
  onAddBookmark,
  onFontChange,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  disabled,
  bookId,
  chapterTitle,
  onOpenToc,
  offline,
  onCacheChapter,
  // 新增设置面板 props
  onLineChange,
  lineHeight,
  onCycleWidth,
  pageWidth,
  onToggleMode,
  mode,
  onSetTheme,
  onSetFontFamily,
  fontFamily,
  readingMinutes,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="reader-toolbar-modern">
      <div className="topbar-inner reader-toolbar-inner">
        <div className="reader-toolbar-left">
          {offline && <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 600, marginRight: "4px" }} title="离线模式">📡</span>}
          <Link to={`/book/${encodeURIComponent(bookId)}`} className="btn btn-ghost reader-back" aria-label="返回书籍详情">
            ← 返回
          </Link>
          <button type="button" onClick={onPrev} disabled={!hasPrev || disabled} className="btn btn-ghost" aria-label="上一章">
            上一章
          </button>
          <button type="button" onClick={onNext} disabled={!hasNext || disabled} className="btn btn-ghost" aria-label="下一章">
            下一章
          </button>
          <button type="button" onClick={onOpenToc} className="btn btn-ghost" aria-label="打开目录">
            ☰ 目录
          </button>
          {chapterTitle && <span className="reader-toolbar-title">{chapterTitle}</span>}
        </div>
        <div className="reader-toolbar-right">
          <span className="toolbar-progress-label">{Math.round(progress * 100)}%</span>
          <button type="button" className="btn btn-ghost" onClick={() => onFontChange(-1)} disabled={fontSize <= 14} aria-label="缩小字号">
            A-
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onFontChange(1)} disabled={fontSize >= 28} aria-label="放大字号">
            A+
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCycleTheme} aria-label="切换主题">
            {themeLabel}
          </button>
          <button
            type="button"
            className="btn btn-ghost reader-more-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="更多"
            aria-expanded={menuOpen}
          >
            ···
          </button>
        </div>
      </div>

      {/* 二级菜单 */}
      {menuOpen && (
        <div className="reader-menu card">
          <div className="reader-menu-grid">
            <button type="button" className="reader-menu-item" onClick={onAddBookmark} title="添加书签 (B)">
              <span className="reader-menu-icon">🔖</span>
              <span className="reader-menu-label">书签</span>
            </button>
            <button type="button" className="reader-menu-item" onClick={onOpenBookmarks}>
              <span className="reader-menu-icon">📑</span>
              <span className="reader-menu-label">书签夹</span>
            </button>
            <button type="button" className="reader-menu-item" onClick={() => { setSettingsOpen(!settingsOpen); }}>
              <span className="reader-menu-icon">⚙️</span>
              <span className="reader-menu-label">设置</span>
            </button>
            {onCacheChapter && !offline && (
              <button type="button" className="reader-menu-item" onClick={onCacheChapter} title="缓存本章供离线阅读">
                <span className="reader-menu-icon">📥</span>
                <span className="reader-menu-label">缓存</span>
              </button>
            )}
            <button type="button" className="reader-menu-item" onClick={onToggleMode}>
              <span className="reader-menu-icon">{mode === "scroll" ? "📄" : "📜"}</span>
              <span className="reader-menu-label">{mode === "scroll" ? "分页" : "滚动"}</span>
            </button>
            {readingMinutes != null && (
              <div className="reader-menu-item reader-menu-stats">
                <span className="reader-menu-icon">⏱</span>
                <span className="reader-menu-label">{readingMinutes.current ?? 0} 分钟</span>
              </div>
            )}
          </div>
          <p className="reader-hotkeys">
            ←→ 翻章 · [ ] 字号 · T 主题 · B 书签 · M 模式
          </p>
        </div>
      )}

      {/* 设置面板 */}
      {settingsOpen && (
        <div className="reader-panel card">
          <div className="reader-panel-row">
            <span>主题</span>
            <div className="theme-pills">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-pill theme-pill-${t.id} ${theme === t.id ? "active" : ""}`}
                  onClick={() => onSetTheme(t.id)}
                  title={t.label}
                >
                  <span className="theme-dot" />
                </button>
              ))}
            </div>
          </div>
          <div className="reader-panel-row">
            <span>字体</span>
            <div className="reader-panel-btns">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`btn btn-ghost ${fontFamily === f.id ? "btn-secondary" : ""}`}
                  onClick={() => onSetFontFamily(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="reader-panel-row">
            <span>字号 {fontSize}px</span>
            <div className="reader-panel-btns">
              <button type="button" className="btn btn-ghost" onClick={() => onFontChange(-1)}>A-</button>
              <button type="button" className="btn btn-ghost" onClick={() => onFontChange(1)}>A+</button>
            </div>
          </div>
          <div className="reader-panel-row">
            <span>行距 {lineHeight?.toFixed(1)}</span>
            <div className="reader-panel-btns">
              <button type="button" className="btn btn-ghost" onClick={() => onLineChange?.(-0.1)}>紧</button>
              <button type="button" className="btn btn-ghost" onClick={() => onLineChange?.(0.1)}>松</button>
            </div>
          </div>
          <div className="reader-panel-row">
            <span>版心宽度</span>
            <button type="button" className="btn btn-secondary" onClick={onCycleWidth}>
              {pageWidth === "sm" ? "窄" : pageWidth === "lg" ? "宽" : "中"}
            </button>
          </div>
          <div className="reader-panel-row">
            <span>阅读模式</span>
            <button type="button" className="btn btn-secondary" onClick={onToggleMode}>
              {mode === "scroll" ? "滚动" : "页码"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}