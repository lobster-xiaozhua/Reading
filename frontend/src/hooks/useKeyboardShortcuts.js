import { useEffect, useCallback } from "react";

/**
 * 阅读器键盘快捷键 hook
 * 支持：←→ 翻章 · [ ] 字号 · T 主题 · B 书签 · M 模式 · A 自动滚屏 · F 全屏
 */
export function useKeyboardShortcuts({
  mode,
  goChapter,
  chapter,
  onFontChange,
  cycleTheme,
  onAddBookmark,
  setPageIndex,
  onToggleMode,
  onToggleAutoScroll,
  onToggleImmersive,
}) {
  const handleKey = useCallback((e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    // 分页模式下：↑↓ 翻页，不冒泡到 switch（PageMode 优先）
    if (mode === "page") {
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setPageIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setPageIndex((p) => p + 1);
        return;
      }
    }

    switch (e.key) {
      case "ArrowLeft":
      case "h":
        e.preventDefault();
        if (chapter?.prev) goChapter(chapter.prev);
        break;
      case "ArrowRight":
      case "l":
        e.preventDefault();
        if (chapter?.next) goChapter(chapter.next);
        break;
      case "[":
      case "-":
        onFontChange(-1);
        break;
      case "]":
      case "=":
        onFontChange(1);
        break;
      case "t":
      case "T":
        cycleTheme();
        break;
      case "b":
      case "B":
        onAddBookmark();
        break;
      case "m":
      case "M":
        e.preventDefault();
        onToggleMode?.();
        break;
      case "a":
      case "A":
        e.preventDefault();
        onToggleAutoScroll?.();
        break;
      case "f":
      case "F":
        e.preventDefault();
        onToggleImmersive?.();
        break;
      case "?":
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("reader:show-shortcuts"));
        break;
    }
  }, [mode, chapter, goChapter, onFontChange, cycleTheme, onAddBookmark, setPageIndex, onToggleMode, onToggleAutoScroll, onToggleImmersive]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);
}