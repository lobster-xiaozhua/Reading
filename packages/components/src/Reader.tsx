/* ============================================================
 * Reader · 03 §5.3 / §6.3
 * 阅读器容器：正文渲染 + 顶部/底部控制栏 + 章节加载 + 闲置 3s 淡出
 * 翻页：slide（横向位移）/ scroll（原生滚动）/ click（点击左/右半屏淡入）
 *   - 正文 font-serif，首行缩进 2em，段间距 1em，两端对齐
 *   - 最大行宽 756px（lg/xl）居中，左右 padding space-8
 *   - 主题色板通过 CSS 变量 --novel-read-bg/text/secondary 切换
 *   - 控制栏闲置 3s 自动淡出 opacity 1→0 dur-normal 240ms
 *   - 章节加载：缓存未命中显示顶部 2px 加载条，不遮挡正文
 * ============================================================ */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  type ReaderSettings as ReaderSettingsValue,
  LINE_HEIGHT_VALUE,
  FONT_FAMILY_VAR,
  THEME_VARS,
} from "./useReaderSettings.js";
import { ReadingProgress } from "./ReadingProgress.js";
import { ReaderSettings } from "./ReaderSettings.js";
import {
  NavigationChevronLeft,
  NavigationChevronRight,
  NavigationMenu,
  SystemSettings,
  NovelMoon,
  NovelSun,
  NovelBookmark,
  NovelBookmarkFilled,
} from "@novel/icons";

export interface ReaderChapter {
  id: string;
  title: string;
  /** 章节正文 HTML（段落以 <p> 包裹） */
  content: string;
}

export interface ReaderProps {
  /** 当前章节（外部受控传入；不传时配合 useReaderCache 内部管理） */
  chapter: ReaderChapter | null;
  /** 章节加载中 */
  loading?: boolean;
  /** 章节加载错误 */
  error?: Error | null;
  /** 当前章节序号（1-based） */
  currentIndex?: number;
  /** 总章节数 */
  totalChapters?: number;
  /** 当前章节内阅读进度 0-100 */
  chapterPercent?: number;
  /** 阅读设置 */
  settings: ReaderSettingsValue;
  /** 设置变更回调 */
  onSettingsChange: (next: ReaderSettingsValue) => void;
  /** 上一章；为 null 时禁用按钮 */
  onPrev?: () => void;
  /** 下一章；为 null 时禁用按钮 */
  onNext?: () => void;
  /** 章节跳转（序号 1-based），用于 ReadingProgress seek */
  onSeek?: (chapter: number) => void;
  /** 目录按钮回调 */
  onCatalog?: () => void;
  /** 返回回调 */
  onBack?: () => void;
  /** 进度回调（章节内滚动位置变化） */
  onProgress?: (percent: number) => void;
  /** 是否禁用拖拽进度（H5 默认禁用），默认 false */
  disableSeek?: boolean;
  /** 自定义顶部栏右侧内容（替代默认设置按钮） */
  topBarExtra?: ReactNode;
  /** 当前章节是否已书签 */
  isBookmarked?: boolean;
  /** 切换书签回调 */
  onBookmark?: (toggled: boolean) => void;
  /** 下一章标题（用于章节末预览卡） */
  nextChapterTitle?: string;
  /** 下一章预览文字（前 200 字） */
  nextChapterPreview?: string;
  /** 翻页模式 */
  className?: string;
}

/* ============================================================
 * Reader
 * ============================================================ */

/** 格式化阅读时长 ms → "1h23m" 或 "23m" 或 "45s" */
function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

export function Reader({
  chapter,
  loading = false,
  error = null,
  currentIndex,
  totalChapters,
  chapterPercent = 0,
  settings,
  onSettingsChange,
  onPrev,
  onNext,
  onSeek,
  onCatalog,
  onBack,
  onProgress,
  disableSeek = false,
  topBarExtra,
  isBookmarked = false,
  onBookmark,
  nextChapterTitle,
  nextChapterPreview,
  className,
}: ReaderProps) {
  const [controlsVisible, setControlsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  /** 章节切换时触发的过渡帧计数，驱动 CSS 交叉淡入动画 */
  const [chapterTransKey, setChapterTransKey] = useState(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const prevChapterIdRef = useRef<string | null>(null);

  /* ---------- 主题/字体/行距通过 inline style 注入 CSS 变量 ---------- */
  const themeVars = THEME_VARS[settings.theme];
  const fontFamilyVar = FONT_FAMILY_VAR[settings.fontFamily];
  const lineHeightVal = LINE_HEIGHT_VALUE[settings.lineHeight];

  const containerStyle: CSSProperties = {
    // 切换主题仅改这一层 L2 变量，dur-instant 90ms 避免色彩流动
    ["--novel-read-bg" as string]: themeVars.bg,
    ["--novel-read-text" as string]: themeVars.text,
    ["--novel-read-text-secondary" as string]: themeVars.secondary,
    ["--reader-font-family" as string]: fontFamilyVar,
    background: "var(--novel-read-bg)",
    color: "var(--novel-read-text)",
    transition:
      "background var(--dur-instant) var(--ease-standard), color var(--dur-instant) var(--ease-standard)",
  };

  const contentStyle: CSSProperties = {
    fontFamily: "var(--reader-font-family)",
    fontSize: `${settings.fontSize}px`,
    lineHeight: lineHeightVal,
  };

  /* ---------- 闲置 3s 淡出控制栏 ---------- */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      // 设置面板打开时不自动淡出
      if (!settingsVisible) setControlsVisible(false);
    }, 3000);
  }, [settingsVisible]);

  // 切换设置面板时同步控制栏显隐
  useEffect(() => {
    if (settingsVisible) {
      setControlsVisible(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
  }, [settingsVisible]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  /* ---------- 翻页方式：scroll 用原生滚动监听进度 ---------- */
  const handleScroll = useCallback(() => {
    if (settings.pageMode !== "scroll") return;
    const el = contentRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight) {
      onProgress?.(100);
      return;
    }
    const p = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
    onProgress?.(Math.max(0, Math.min(100, p)));
  }, [settings.pageMode, onProgress]);

  /* ---------- 翻页：click 模式点击左/右半屏 ---------- */
  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 有文本选区时视为选词/复制意图，不触发翻页（避免跨半屏选词被翻页打断）
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim()) {
        return;
      }
      if (settings.pageMode !== "click") {
        // 非点击翻页模式：点击中央区域唤出控制栏
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const w = rect.width;
        // 中央 40% 区域：唤出控制栏
        if (x > w * 0.3 && x < w * 0.7) {
          showControls();
        }
        return;
      }
      // click 翻页：左半屏上一章，右半屏下一章；中央唤出控制栏
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const w = rect.width;
      if (x > w * 0.3 && x < w * 0.7) {
        showControls();
        return;
      }
      if (x <= w * 0.3) {
        onPrev?.();
      } else {
        onNext?.();
      }
    },
    [settings.pageMode, onPrev, onNext, showControls],
  );

  /* ---------- 夜间模式快捷切换（双击/栏按钮共用） ---------- */
  const toggleNight = useCallback(() => {
    onSettingsChange({
      ...settings,
      theme: settings.theme === "night" ? "day" : "night",
    });
  }, [settings, onSettingsChange]);

  /* ---------- 书签切换 ---------- */
  const toggleBookmark = useCallback(() => {
    const toggled = !isBookmarked;
    onBookmark?.(toggled);
  }, [isBookmarked, onBookmark]);

  /* ---------- 阅读时长计时器（每 1s 更新一次） ---------- */
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - sessionStartRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /* ---------- P7-3 阅读器手势矩阵 ---------- */
  /* 手势优先级：长按 > 双击 > 滑动（左右/上下）> 单击
   *   - 左右滑：slide 模式翻页（threshold 50px）
   *   - 上下滑：scroll 模式由原生滚动接管；slide/click 模式上下滑不翻页
   *   - 双击：300ms 内二次点击 → 切换日/夜主题
   *   - 长按：500ms 触发选词/笔记菜单（emitted via onLongPress，外层可挂接）
   *   - 中央点击：唤出控制栏（30%~70% 区域）
   *   - 左右半屏：click 模式翻页
   */
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const lastTapTime = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const t = e.touches[0];
      if (!t) return;
      touchStartX.current = t.clientX;
      touchStartY.current = t.clientY;
      touchStartTime.current = Date.now();
      longPressFiredRef.current = false;
      // 长按 500ms 触发（仅 click/slide 模式；scroll 模式长按可能误触）
      if (settings.pageMode !== "scroll") {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = setTimeout(() => {
          longPressFiredRef.current = true;
          // 长按反馈：唤出控制栏（外层可挂接选词菜单）
          showControls();
        }, 500);
      }
    },
    [settings.pageMode, showControls],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      // 取消长按定时器
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      // 长按已触发则不再处理滑动/点击
      if (longPressFiredRef.current) return;

      if (touchStartX.current == null || touchStartY.current == null) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const endX = touch.clientX;
      const endY = touch.clientY;
      const dx = endX - touchStartX.current;
      const dy = endY - touchStartY.current;
      const threshold = 50;
      const elapsed = Date.now() - touchStartTime.current;

      // 判定滑动：位移超阈值且主要方向明确
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx > threshold && absDx > absDy) {
        // 左右滑
        if (settings.pageMode === "slide") {
          if (dx > threshold) onPrev?.();
          else if (dx < -threshold) onNext?.();
        }
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }
      // 上下滑交给原生滚动，不在此处理

      // 视为点击：判定双击（300ms 内二次点击）
      if (elapsed < 500) {
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          // 双击：切换日/夜
          toggleNight();
          lastTapTime.current = 0;
          touchStartX.current = null;
          touchStartY.current = null;
          return;
        }
        lastTapTime.current = now;
      }
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [settings.pageMode, onPrev, onNext, toggleNight],
  );

  /* ---------- 手指移动超阈值时取消长按（避免误触） ---------- */
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = Math.abs(t.clientX - touchStartX.current);
    const dy = Math.abs(t.clientY - touchStartY.current);
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  /* ---------- P8-A2 键盘导航矩阵 ---------- */
  /* ←/→：上下章；↑/↓：滚动；Space：下一章（Shift+Space 上一章）；
   * Esc：隐藏控制栏/关闭设置；Tab：自然顺序；Enter：唤出控制栏 */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 设置面板打开时让 ReaderSettings 自己处理 Tab/Esc，避免抢焦点
      if (settingsVisible) return;
      switch (e.key) {
        case "ArrowLeft":
          if (onPrev) {
            e.preventDefault();
            onPrev();
          }
          break;
        case "ArrowRight":
        case " ":
          if (e.key === " " && e.shiftKey) {
            if (onPrev) {
              e.preventDefault();
              onPrev();
            }
          } else if (onNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case "Escape":
          if (controlsVisible) {
            e.preventDefault();
            setControlsVisible(false);
          }
          break;
        case "Enter":
          e.preventDefault();
          showControls();
          break;
        // ↑/↓ 交由原生滚动，不拦截
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrev, onNext, controlsVisible, settingsVisible, showControls]);

  /* ---------- 章节切换时触发淡入动画 + 重置滚动 ---------- */
  useEffect(() => {
    if (chapter?.id && chapter.id !== prevChapterIdRef.current) {
      prevChapterIdRef.current = chapter.id;
      setChapterTransKey((k) => k + 1);
      if (contentRef.current && settings.pageMode === "scroll") {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [chapter?.id, settings.pageMode]);

  /* ---------- 渲染 ---------- */
  const rootCls = [
    "novel-reader",
    `novel-reader--${settings.pageMode}`,
    `novel-reader--theme-${settings.theme}`,
    controlsVisible ? "is-controls-visible" : "is-controls-hidden",
    loading ? "is-loading" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const hasProgress = currentIndex != null && totalChapters != null;

  return (
    <div className={rootCls} style={containerStyle}>
      {/* P8-A1 屏幕阅读器翻页播报：aria-live 章节切换通知 */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {chapter
          ? `已加载章节：${chapter.title}${
              hasProgress
                ? `，第 ${currentIndex} 章，共 ${totalChapters} 章`
                : ""
            }`
          : loading
            ? "章节加载中"
            : ""}
      </div>

      {/* 顶部进度条（始终可见，不挤压正文） */}
      {hasProgress ? (
        <ReadingProgress
          current={currentIndex!}
          total={totalChapters!}
          percent={chapterPercent}
          onSeek={onSeek}
          disableSeek={disableSeek}
        />
      ) : null}

      {/* 章节加载条（缓存未命中时显示，不遮挡正文） */}
      {loading ? (
        <div
          className="novel-reader__loading-bar"
          role="status"
          aria-label="章节加载中"
        >
          <div className="novel-reader__loading-bar-fill" />
        </div>
      ) : null}

      {/* 正文区 */}
      <div
        ref={contentRef}
        className="novel-reader__content"
        style={contentStyle}
        onClick={handleContentClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={handleScroll}
        /* P8-A1 语义化：正文区标注为文章主体，屏幕阅读器可跳转 */
        aria-label="章节正文"
      >
        <div className="novel-reader__inner">
          {error ? (
            <div className="novel-reader__error" role="alert">
              <p>章节加载失败</p>
              <p className="novel-reader__error-detail">{error.message}</p>
              <button
                type="button"
                className="novel-reader__nav-btn novel-reader__nav-btn--primary"
                onClick={() => {
                  // 触发重新加载
                  window.location.reload();
                }}
              >
                重试
              </button>
            </div>
          ) : chapter ? (
            <article
              className={[
                "novel-reader__chapter-content",
                chapterTransKey > 0 ? "is-entering" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <h1 className="novel-reader__chapter-title">{chapter.title}</h1>
              <div
                className="novel-reader__article-body"
                // content 由调用方控制 HTML，已是受信任的章节正文
                dangerouslySetInnerHTML={{ __html: chapter.content }}
              />
              {/* 章末操作 */}
              <div className="novel-reader__chapter-end">
                <button
                  type="button"
                  className="novel-reader__nav-btn novel-reader__nav-btn--primary"
                  onClick={onNext}
                  disabled={!onNext}
                >
                  下一章
                </button>
                <button
                  type="button"
                  className="novel-reader__nav-btn"
                  onClick={onPrev}
                  disabled={!onPrev}
                >
                  上一章
                </button>
              </div>
              {/* 下一章预览卡 */}
              {nextChapterTitle ? (
                <div className="novel-reader__next-chapter-preview">
                  <div className="novel-reader__next-chapter-preview-label">
                    <span className="novel-reader__next-chapter-preview-badge">
                      下一章
                    </span>
                    <span className="novel-reader__next-chapter-preview-title">
                      {nextChapterTitle}
                    </span>
                  </div>
                  {nextChapterPreview ? (
                    <p className="novel-reader__next-chapter-preview-text">
                      {nextChapterPreview}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="novel-reader__nav-btn novel-reader__nav-btn--primary"
                    onClick={onNext}
                    disabled={!onNext}
                  >
                    立即阅读
                  </button>
                </div>
              ) : null}
            </article>
          ) : loading ? (
            <div className="novel-reader__placeholder" aria-hidden />
          ) : null}
        </div>
      </div>

      {/* 点击翻页模式：左右半屏点击区视觉提示 */}
      {settings.pageMode === "click" && chapter ? (
        <>
          <div
            className="novel-reader__tap-zone novel-reader__tap-zone--left"
            aria-hidden
          />
          <div
            className="novel-reader__tap-zone novel-reader__tap-zone--right"
            aria-hidden
          />
        </>
      ) : null}

      {/* 顶部栏（浮层，闲置 3s 淡出） */}
      <div className="novel-reader__topbar" aria-hidden={!controlsVisible}>
        <button
          type="button"
          className="novel-reader__icon-btn"
          aria-label="返回"
          onClick={onBack}
        >
          <NavigationChevronLeft size="lg" aria-hidden="true" />
        </button>
        <div className="novel-reader__topbar-title-wrap">
          <div className="novel-reader__topbar-chapter-num">
            {currentIndex != null && totalChapters != null
              ? `${currentIndex} / ${totalChapters}`
              : ""}
          </div>
          <div className="novel-reader__topbar-title">
            {chapter?.title ?? ""}
          </div>
          <div className="novel-reader__topbar-elapsed">
            {formatElapsed(elapsedMs)}
          </div>
        </div>
        <div className="novel-reader__topbar-right">
          {topBarExtra ?? (
            <>
              <button
                type="button"
                className="novel-reader__icon-btn"
                aria-label={isBookmarked ? "已收藏本章" : "收藏本章"}
                onClick={toggleBookmark}
              >
                {isBookmarked ? (
                  <NovelBookmarkFilled size="lg" aria-hidden="true" />
                ) : (
                  <NovelBookmark size="lg" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                className="novel-reader__icon-btn"
                aria-label="阅读设置"
                onClick={() => setSettingsVisible(true)}
              >
                <SystemSettings size="lg" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 底部控制栏（浮层，闲置 3s 淡出） */}
      <div className="novel-reader__bottombar" aria-hidden={!controlsVisible}>
        <button
          type="button"
          className="novel-reader__bar-btn"
          aria-label="上一章"
          onClick={onPrev}
          disabled={!onPrev}
        >
          <NavigationChevronLeft size="lg" aria-hidden="true" />
          <span>上一章</span>
        </button>
        <button
          type="button"
          className="novel-reader__bar-btn"
          aria-label="目录"
          onClick={onCatalog}
        >
          <NavigationMenu size="lg" aria-hidden="true" />
          <span>目录</span>
        </button>
        <button
          type="button"
          className="novel-reader__bar-btn"
          aria-label="阅读设置"
          onClick={() => setSettingsVisible(true)}
        >
          <SystemSettings size="lg" aria-hidden="true" />
          <span>设置</span>
        </button>
        <button
          type="button"
          className="novel-reader__bar-btn"
          aria-label={isBookmarked ? "已收藏本章" : "收藏本章"}
          onClick={toggleBookmark}
        >
          {isBookmarked ? (
            <NovelBookmarkFilled size="lg" aria-hidden="true" />
          ) : (
            <NovelBookmark size="lg" aria-hidden="true" />
          )}
          <span>书签</span>
        </button>
        <button
          type="button"
          className="novel-reader__bar-btn"
          aria-label={settings.theme === "night" ? "切换日间" : "切换夜间"}
          onClick={toggleNight}
        >
          {settings.theme === "night" ? (
            <NovelSun size="lg" aria-hidden="true" />
          ) : (
            <NovelMoon size="lg" aria-hidden="true" />
          )}
          <span>{settings.theme === "night" ? "日间" : "夜间"}</span>
        </button>
        <button
          type="button"
          className="novel-reader__bar-btn"
          aria-label="下一章"
          onClick={onNext}
          disabled={!onNext}
        >
          <NavigationChevronRight size="lg" aria-hidden="true" />
          <span>下一章</span>
        </button>
      </div>

      {/* 设置面板 */}
      <ReaderSettings
        settings={settings}
        onChange={onSettingsChange}
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </div>
  );
}
