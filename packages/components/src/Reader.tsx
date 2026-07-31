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
} from 'react';
import {
  type ReaderSettings as ReaderSettingsValue,
  LINE_HEIGHT_VALUE,
  FONT_FAMILY_VAR,
  THEME_VARS,
} from './useReaderSettings.js';
import { ReadingProgress } from './ReadingProgress.js';
import { ReaderSettings } from './ReaderSettings.js';

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
  className?: string;
}

/* ---------- 图标 ---------- */

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function PrevIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function CatalogIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </svg>
  );
}

/* ============================================================
 * Reader
 * ============================================================ */

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
  className,
}: ReaderProps) {
  const [controlsVisible, setControlsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  /* ---------- 主题/字体/行距通过 inline style 注入 CSS 变量 ---------- */
  const themeVars = THEME_VARS[settings.theme];
  const fontFamilyVar = FONT_FAMILY_VAR[settings.fontFamily];
  const lineHeightVal = LINE_HEIGHT_VALUE[settings.lineHeight];

  const containerStyle: CSSProperties = {
    // 切换主题仅改这一层 L2 变量，dur-instant 90ms 避免色彩流动
    ['--novel-read-bg' as string]: themeVars.bg,
    ['--novel-read-text' as string]: themeVars.text,
    ['--novel-read-text-secondary' as string]: themeVars.secondary,
    ['--reader-font-family' as string]: fontFamilyVar,
    background: 'var(--novel-read-bg)',
    color: 'var(--novel-read-text)',
    transition: 'background var(--dur-instant) var(--ease-standard), color var(--dur-instant) var(--ease-standard)',
  };

  const contentStyle: CSSProperties = {
    fontFamily: 'var(--reader-font-family)',
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
    if (settings.pageMode !== 'scroll') return;
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
      if (settings.pageMode !== 'click') {
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

  /* ---------- 翻页：slide 模式手势左右滑 ---------- */
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (settings.pageMode !== 'slide') return;
    touchStartX.current = e.touches[0].clientX;
  }, [settings.pageMode]);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (settings.pageMode !== 'slide') return;
      if (touchStartX.current == null) return;
      const endX = e.changedTouches[0].clientX;
      const dx = endX - touchStartX.current;
      const threshold = 50;
      if (dx > threshold) {
        onPrev?.();
      } else if (dx < -threshold) {
        onNext?.();
      }
      touchStartX.current = null;
    },
    [settings.pageMode, onPrev, onNext],
  );

  /* ---------- 章节切换时重置滚动位置 ---------- */
  useEffect(() => {
    if (contentRef.current && settings.pageMode === 'scroll') {
      contentRef.current.scrollTop = 0;
    }
  }, [chapter?.id, settings.pageMode]);

  /* ---------- 夜间模式快捷切换 ---------- */
  const toggleNight = useCallback(() => {
    onSettingsChange({
      ...settings,
      theme: settings.theme === 'night' ? 'day' : 'night',
    });
  }, [settings, onSettingsChange]);

  /* ---------- 渲染 ---------- */
  const rootCls = [
    'novel-reader',
    `novel-reader--${settings.pageMode}`,
    `novel-reader--theme-${settings.theme}`,
    controlsVisible ? 'is-controls-visible' : 'is-controls-hidden',
    loading ? 'is-loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasProgress = currentIndex != null && totalChapters != null;

  return (
    <div className={rootCls} style={containerStyle}>
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
        <div className="novel-reader__loading-bar" role="status" aria-label="章节加载中">
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
        onTouchEnd={handleTouchEnd}
        onScroll={handleScroll}
      >
        <div className="novel-reader__inner">
          {error ? (
            <div className="novel-reader__error" role="alert">
              <p>章节加载失败</p>
              <p className="novel-reader__error-detail">{error.message}</p>
            </div>
          ) : chapter ? (
            <article>
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
            </article>
          ) : loading ? (
            <div className="novel-reader__placeholder" aria-hidden />
          ) : null}
        </div>
      </div>

      {/* 点击翻页模式：左右半屏点击区视觉提示 */}
      {settings.pageMode === 'click' && chapter ? (
        <>
          <div className="novel-reader__tap-zone novel-reader__tap-zone--left" aria-hidden />
          <div className="novel-reader__tap-zone novel-reader__tap-zone--right" aria-hidden />
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
          <BackIcon />
        </button>
        <div className="novel-reader__topbar-title">
          {chapter?.title ?? ''}
        </div>
        <div className="novel-reader__topbar-right">
          {topBarExtra ?? (
            <button
              type="button"
              className="novel-reader__icon-btn"
              aria-label="阅读设置"
              onClick={() => setSettingsVisible(true)}
            >
              <SettingsIcon />
            </button>
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
          <PrevIcon />
          <span>上一章</span>
        </button>
        <button
          type="button"
          className="novel-reader__bar-btn"
          aria-label="目录"
          onClick={onCatalog}
        >
          <CatalogIcon />
          <span>目录</span>
        </button>
        <button
          type="button"
          className="novel-reader__bar-btn"
          aria-label="阅读设置"
          onClick={() => setSettingsVisible(true)}
        >
          <SettingsIcon />
          <span>设置</span>
        </button>
        <button
          type="button"
          className="novel-reader__bar-btn"
          aria-label={settings.theme === 'night' ? '切换日间' : '切换夜间'}
          onClick={toggleNight}
        >
          {settings.theme === 'night' ? <SunIcon /> : <MoonIcon />}
          <span>{settings.theme === 'night' ? '日间' : '夜间'}</span>
        </button>
        <button
          type="button"
          className="novel-reader__bar-btn"
          aria-label="下一章"
          onClick={onNext}
          disabled={!onNext}
        >
          <NextIcon />
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
