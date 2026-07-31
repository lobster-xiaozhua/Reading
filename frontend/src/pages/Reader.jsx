import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { fetchChapter, fetchBookDetail, setCachedChapter } from "../api.ts";
import { useReadingTimer } from "../hooks/useReadingTimer.js";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts.js";
import Toolbar from "../components/Toolbar.jsx";
import TocDrawer from "../components/TocDrawer.jsx";
import AutoScroll from "../components/AutoScroll.jsx";
import ReaderHighlight from "../components/ReaderHighlight.jsx";
import ShortcutHelp from "../components/ShortcutHelp.jsx";
import "../styles/_reader.css";
import {
  addBookmark,
  getBookmarks,
  removeBookmark,
  formatRelative,
} from "../lib/localLibrary.js";

const FONT_SIZE_KEY = "reader:font:global";
const THEME_KEY = "reader:theme:global";
const WIDTH_KEY = "reader:width";
const LINE_KEY = "reader:line";
const FONT_FAMILY_KEY = "reader:font-family";
const MODE_KEY = "reader:mode";
const PROGRESS_KEY = (bookId) => `reader:progress:${bookId}`;
const BUFFER = 6;

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

function VirtualParagraphs({ paragraphs, scrollRef, fontSize, lineHeight, highlightText, renderParagraph }) {
  const [range, setRange] = useState({ start: 0, end: 0 });
  const EST = Math.round(fontSize * lineHeight) + 16;
  const totalHeight = paragraphs.length * EST;

  const recompute = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const viewport = el.clientHeight || 600;
    const start = Math.max(0, Math.floor(scrollTop / EST) - BUFFER);
    const visibleCount = Math.ceil(viewport / EST);
    const end = Math.min(paragraphs.length, start + visibleCount + BUFFER * 2);
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, [EST, paragraphs.length, scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    recompute();
    el.addEventListener("scroll", recompute, { passive: true });
    return () => el.removeEventListener("scroll", recompute);
  }, [recompute, scrollRef]);

  useEffect(() => {
    recompute();
  }, [EST, paragraphs, recompute]);

  const items = useMemo(() => {
    const result = [];
    for (let i = range.start; i < range.end; i++) {
      const p = paragraphs[i];
      const content = renderParagraph
        ? renderParagraph(p, i)
        : highlightText && p.includes(highlightText)
          ? p.split(highlightText).reduce((acc, seg, idx, arr) => {
              acc.push(seg);
              if (idx < arr.length - 1) acc.push(<mark key={idx} className="reader-highlight">{highlightText}</mark>);
              return acc;
            }, [])
          : p;
      result.push(
        <p key={i} style={{ position: "absolute", top: i * EST, left: 0, right: 0, margin: 0, paddingBottom: 16 }}>
          {content}
        </p>
      );
    }
    return result;
  }, [range.start, range.end, EST, paragraphs, highlightText, renderParagraph]);

  return (
    <div className="virtual-paragraphs" style={{ position: "relative", height: totalHeight }}>
      {items}
    </div>
  );
}

function PageView({ paragraphs, pageIndex, fontSize, lineHeight }) {
  const PAGE_SIZE = Math.max(1, Math.floor(40 / (fontSize / 16)));
  const totalPages = Math.max(1, Math.ceil(paragraphs.length / PAGE_SIZE));
  const idx = Math.min(pageIndex, totalPages - 1);
  const slice = paragraphs.slice(idx * PAGE_SIZE, (idx + 1) * PAGE_SIZE);

  return (
    <div className="reader-page-mode">
      {slice.map((p, i) => (
        <p key={idx * PAGE_SIZE + i} style={{ margin: 0, paddingBottom: 16 }}>
          {p}
        </p>
      ))}
      <div className="reader-page-indicator">{idx + 1} / {totalPages}</div>
    </div>
  );
}

export default function Reader() {
  const { bookId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const highlight = searchParams.get("highlight") || "";
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allChapters, setAllChapters] = useState([]);
  const [fontSize, setFontSize] = useState(() => {
    const v = localStorage.getItem(FONT_SIZE_KEY);
    return v ? parseInt(v, 10) : 18;
  });
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "night");
  const [pageWidth, setPageWidth] = useState(() => localStorage.getItem(WIDTH_KEY) || "md");
  const [lineHeight, setLineHeight] = useState(() => {
    const v = localStorage.getItem(LINE_KEY);
    return v ? parseFloat(v) : 1.85;
  });
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem(FONT_FAMILY_KEY) || "system");
  const [mode, setMode] = useState(() => localStorage.getItem(MODE_KEY) || "scroll");
  const scrollRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastTapRef = useRef(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [bmOpen, setBmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [toast, setToast] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [autoScroll, setAutoScroll] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const immersiveTimer = useRef(null);

  // 监听离线/在线状态
  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // 缓存章节供离线阅读（写入 IndexedDB，持久化）
  const cacheChapter = useCallback(() => {
    if (!chapter) return;
    setCachedChapter(bookId, chapterId, {
      title: chapter.title,
      paragraphs: chapter.paragraphs,
      prev: chapter.prev,
      next: chapter.next,
      book_title: chapter.book_title,
    });
    showToast("已缓存本章，可离线阅读");
  }, [chapter, bookId, chapterId, showToast]);

  // 使用阅读计时 hook
  const readingMinutes = useReadingTimer({ bookId, chapterId, chapter, mode, pageIndex, fontSize, scrollRef });

  const goChapter = useCallback(
    (cid) => {
      if (!cid) return;
      navigate(`/book/${encodeURIComponent(bookId)}/read/${encodeURIComponent(cid)}`);
    },
    [bookId, navigate]
  );

  const loadChapter = useCallback(
    (cid, signal) => {
      setLoading(true);
      setError("");
      setPageIndex(0);
      fetchChapter(bookId, cid, signal)
        .then((d) => setChapter(d))
        .catch((e) => {
          if (e.name !== 'AbortError') setError(e.message);
        })
        .finally(() => setLoading(false));
    },
    [bookId]
  );

  useEffect(() => {
    const ac = new AbortController();
    loadChapter(chapterId, ac.signal);
    return () => ac.abort();
  }, [chapterId, loadChapter]);

  // 加载全书章节目录（供 TocDrawer 使用）
  useEffect(() => {
    const ac = new AbortController();
    fetchBookDetail(bookId, ac.signal)
      .then((detail) => setAllChapters(detail.chapters || []))
      .catch(() => { /* 静默失败，目录不可用不影响阅读 */ });
    return () => ac.abort();
  }, [bookId]);

  useEffect(() => {
    document.documentElement.setAttribute("data-reader-theme", theme);
    return () => document.documentElement.removeAttribute("data-reader-theme");
  }, [theme]);

  useEffect(() => {
    setBookmarks(getBookmarks(bookId));
  }, [bookId, chapterId]);

  useEffect(() => {
    if (!chapter || !highlight || mode !== "scroll") return;
    const el = scrollRef.current;
    if (!el) return;
    const EST = Math.round(fontSize * lineHeight) + 16;
    const idx = chapter.paragraphs.findIndex((p) => p.includes(highlight));
    if (idx >= 0) {
      el.scrollTop = idx * EST - 100;
    }
  }, [chapter, highlight, mode, fontSize, lineHeight]);

  useEffect(() => {
    if (!chapter || mode === "page") return;
    const saved = localStorage.getItem(PROGRESS_KEY(bookId));
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        if (obj.chapterId === chapterId && scrollRef.current) {
          scrollRef.current.scrollTop = obj.scrollTop || 0;
        }
      } catch { /* ignore */ }
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [chapter, chapterId, bookId, mode]);

  const scrollTick = useRef(null);
  const handleScroll = useCallback(() => {
    if (mode === "page") return;
    if (scrollTick.current) return;
    scrollTick.current = requestAnimationFrame(() => {
      scrollTick.current = null;
      const el = scrollRef.current;
      if (!el || !chapter) return;
      const ratio = el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0;
      setProgress(ratio);
    });
  }, [chapter, mode]);

  // 使用键盘快捷键 hook
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      const dx = touchStartX.current - e.changedTouches[0].clientX;
      const dy = touchStartY.current - e.changedTouches[0].clientY;

      // 垂直滑动圆心区域 → 切换沉浸模式
      if (Math.abs(dy) > 60 && Math.abs(dx) < 30) {
        if (dy > 0) {
          // 上滑隐藏工具栏
          setShowToolbar(false);
          setImmersive(true);
        } else {
          // 下滑显示工具栏
          setShowToolbar(true);
          setImmersive(false);
        }
        return;
      }

      // 双击检测
      const now = Date.now();
      if (now - lastTapRef.current < 300 && Math.abs(dx) < 30 && Math.abs(dy) < 30) {
        lastTapRef.current = 0;
        // 双击切换沉浸模式
        setImmersive((v) => !v);
        setShowToolbar((v) => !v);
        return;
      }
      lastTapRef.current = now;

      // 垂直滑动超过水平 → 不触发翻章
      if (Math.abs(dy) > Math.abs(dx) * 1.5) return;

      if (mode === "page") {
        if (Math.abs(dx) > 50) {
          if (dx > 0) setPageIndex((p) => p + 1);
          else setPageIndex((p) => Math.max(0, p - 1));
        }
        return;
      }
      if (Math.abs(dx) > 50) {
        if (dx > 0 && chapter?.next) goChapter(chapter.next);
        else if (dx < 0 && chapter?.prev) goChapter(chapter.prev);
      }
    },
    [chapter, goChapter, mode]
  );

  // 点击中央区域切换沉浸模式
  const handleContentClick = useCallback(
    (e) => {
      // 不干扰 toolbar 按钮点击、高亮交互
      if (e.target.closest(".reader-toolbar-modern") || e.target.closest(".reader-hl-tooltip") || e.target.closest(".reader-hl-overlay")) return;
      setImmersive((v) => !v);
      setShowToolbar((v) => !v);
    },
    []
  );

  const onFontChange = useCallback((delta) => {
    setFontSize((prev) => {
      const next = Math.min(28, Math.max(14, prev + delta));
      localStorage.setItem(FONT_SIZE_KEY, String(next));
      return next;
    });
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const i = THEMES.findIndex((t) => t.id === prev);
      const next = THEMES[(i + 1) % THEMES.length].id;
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const setThemeId = (id) => {
    setTheme(id);
    localStorage.setItem(THEME_KEY, id);
  };

  const cycleWidth = () => {
    const order = ["sm", "md", "lg"];
    const next = order[(order.indexOf(pageWidth) + 1) % order.length];
    setPageWidth(next);
    localStorage.setItem(WIDTH_KEY, next);
  };

  const onLineChange = (delta) => {
    const next = Math.min(2.4, Math.max(1.4, Math.round((lineHeight + delta) * 10) / 10));
    setLineHeight(next);
    localStorage.setItem(LINE_KEY, String(next));
  };

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "scroll" ? "page" : "scroll";
      localStorage.setItem(MODE_KEY, next);
      return next;
    });
  };

  const setFontFamilyId = (id) => {
    setFontFamily(id);
    localStorage.setItem(FONT_FAMILY_KEY, id);
  };

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }, []);

  const onAddBookmark = useCallback(() => {
    addBookmark({
      bookId, chapterId,
      title: chapter?.title || "",
      scrollTop: scrollRef.current?.scrollTop || 0,
    });
    setBookmarks(getBookmarks(bookId));
    showToast("已添加书签");
  }, [bookId, chapterId, chapter, showToast]);

  // 使用键盘快捷键 hook（替换旧的 keydown 监听）
  useKeyboardShortcuts({ mode, goChapter, chapter, onFontChange, cycleTheme, onAddBookmark, setPageIndex, onToggleMode: toggleMode, onToggleAutoScroll: () => setAutoScroll(v => !v), onToggleImmersive: () => { setImmersive(v => !v); setShowToolbar(v => !v); } });

  if (loading)
    return (
      <div className="reader-loading">
        <div className="empty-spinner" />
        <p>正在加载章节…</p>
      </div>
    );
  if (error)
    return (
      <div className="container-narrow" style={{ paddingTop: "120px", textAlign: "center", color: "#ef4444" }}>
        {error}
      </div>
    );
  if (!chapter) return null;

  const widthClass = pageWidth === "sm" ? "reader-w-sm" : pageWidth === "lg" ? "reader-w-lg" : "reader-w-md";
  const fontCss = FONTS.find((f) => f.id === fontFamily)?.css || "";
  const totalPages = Math.max(1, Math.ceil(chapter.paragraphs.length / Math.max(1, Math.floor(40 / (fontSize / 16)))));

  return (
    <div className={`reader-modern reader-theme-${theme} ${immersive ? "reader-immersive" : ""}`}>
      <div className={`reader-toolbar-modern ${showToolbar ? "" : "reader-toolbar-hidden"}`}>
        <Toolbar
          theme={theme}
          themeLabel={THEMES.find((t) => t.id === theme)?.label || theme}
          fontSize={fontSize}
          progress={mode === "page" ? (pageIndex + 1) / totalPages : progress}
          onCycleTheme={cycleTheme}
          onOpenSettings={() => setPanelOpen((v) => !v)}
          onOpenBookmarks={() => setBmOpen((v) => !v)}
          onAddBookmark={onAddBookmark}
          onFontChange={onFontChange}
          onPrev={() => goChapter(chapter.prev)}
          onNext={() => goChapter(chapter.next)}
          hasPrev={!!chapter.prev}
          hasNext={!!chapter.next}
          disabled={loading}
          bookId={bookId}
          chapterTitle={chapter.title}
          onOpenToc={() => setDrawerOpen(true)}
          offline={offline}
          onCacheChapter={cacheChapter}
          onLineChange={onLineChange}
          lineHeight={lineHeight}
          onCycleWidth={cycleWidth}
          pageWidth={pageWidth}
          onToggleMode={toggleMode}
          mode={mode}
          onSetTheme={setThemeId}
          onSetFontFamily={setFontFamilyId}
          fontFamily={fontFamily}
          readingMinutes={readingMinutes}
        />
      </div>

      {panelOpen && (
        <div className="reader-panel card">
          <div className="reader-panel-row">
            <span>主题</span>
            <div className="theme-pills">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-pill theme-pill-${t.id} ${theme === t.id ? "active" : ""}`}
                  onClick={() => setThemeId(t.id)}
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
                  onClick={() => setFontFamilyId(f.id)}
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
            <span>行距 {lineHeight.toFixed(1)}</span>
            <div className="reader-panel-btns">
              <button type="button" className="btn btn-ghost" onClick={() => onLineChange(-0.1)}>紧</button>
              <button type="button" className="btn btn-ghost" onClick={() => onLineChange(0.1)}>松</button>
            </div>
          </div>
          <div className="reader-panel-row">
            <span>版心宽度</span>
            <button type="button" className="btn btn-secondary" onClick={cycleWidth}>
              {pageWidth === "sm" ? "窄" : pageWidth === "lg" ? "宽" : "中"}
            </button>
          </div>
          <div className="reader-panel-row">
            <span>阅读模式</span>
            <button type="button" className="btn btn-secondary" onClick={toggleMode}>
              {mode === "scroll" ? "滚动" : "页码"}
            </button>
          </div>
          <p className="reader-hotkeys">
            {mode === "page" ? "↑↓ 翻页 · " : ""}←→ 翻章 · [ ] 字号 · T 主题 · B 书签
          </p>
        </div>
      )}

      {bmOpen && (
        <div className="reader-bm-panel card">
          <div className="reader-bm-head">
            <strong>本书书签</strong>
            <button type="button" className="btn btn-ghost" onClick={() => setBmOpen(false)}>关闭</button>
          </div>
          {bookmarks.length === 0 ? (
            <p className="empty-hint">暂无书签，阅读中按 B 或点「书签」添加</p>
          ) : (
            <ul className="reader-bm-list">
              {bookmarks.map((bm) => (
                <li key={bm.id}>
                  <button
                    type="button"
                    className="reader-bm-item"
                    onClick={() => {
                      setBmOpen(false);
                      if (bm.chapterId === chapterId && scrollRef.current) {
                        scrollRef.current.scrollTop = bm.scrollTop || 0;
                      } else {
                        navigate(`/book/${encodeURIComponent(bookId)}/read/${encodeURIComponent(bm.chapterId)}`);
                      }
                    }}
                  >
                    <span className="reader-bm-title">{bm.title || bm.chapterId}</span>
                    <span className="reader-bm-meta">{formatRelative(bm.at)}</span>
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => {
                    removeBookmark(bookId, bm.id);
                    setBookmarks(getBookmarks(bookId));
                  }}>
                    删
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className={`reader-scroll-modern ${mode === "page" ? "reader-page-container" : ""}`}
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        <article
          className={`reader-content-modern ${widthClass}`}
          style={{ fontSize: `${fontSize}px`, lineHeight, fontFamily: fontCss || undefined }}
        >
          <p className="reader-book-label">{chapter.book_title}</p>
          <h1>{chapter.title}</h1>
          {mode === "scroll" ? (
            <ReaderHighlight
              bookId={bookId}
              chapterId={chapterId}
              scrollRef={scrollRef}
              fontSize={fontSize}
              lineHeight={lineHeight}
            >
              {({ renderParagraph }) => (
                <VirtualParagraphs
                  paragraphs={chapter.paragraphs}
                  scrollRef={scrollRef}
                  fontSize={fontSize}
                  lineHeight={lineHeight}
                  highlightText={highlight}
                  renderParagraph={renderParagraph}
                />
              )}
            </ReaderHighlight>
          ) : (
            <PageView
              paragraphs={chapter.paragraphs}
              pageIndex={pageIndex}
              fontSize={fontSize}
              lineHeight={lineHeight}
            />
          )}
          <div className="reader-end-modern">—— 本章完 ——</div>
          <nav className="reader-nav-modern">
            {chapter.prev && (
              <button onClick={() => goChapter(chapter.prev)} className="btn btn-secondary">← 上一章</button>
            )}
            <Link to={`/book/${encodeURIComponent(bookId)}`} className="btn btn-ghost">目录</Link>
            {chapter.next && (
              <button onClick={() => goChapter(chapter.next)} className="btn btn-secondary">下一章 →</button>
            )}
          </nav>
        </article>
      </div>
      {mode === "scroll" && (
        <AutoScroll scrollRef={scrollRef} />
      )}
      <div className="reader-progress-bar" role="progressbar" aria-valuenow={Math.round((mode === "page" ? (pageIndex + 1) / totalPages : progress) * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="reader-progress-bar-fill" style={{ width: `${Math.round((mode === "page" ? (pageIndex + 1) / totalPages : progress) * 100)}%` }} />
      </div>
      {toast && <div className="reader-toast">{toast}</div>}
      <ShortcutHelp />
      <TocDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chapters={allChapters}
        currentChapterId={chapterId}
        onSelect={(cid) => { setDrawerOpen(false); goChapter(cid); }}
      />
    </div>
  );
}