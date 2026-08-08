/* ============================================================
 * P5-3 · 阅读器页
 * 路由 /read/:bookId/:chapterId?
 * 接入 useReaderCache（±2 预加载 / LRU 5）+ useReaderSettings
 * 章节切换 / 上下章 / 目录抽屉 / 阅读进度记录 / 书签 / 阅读时长
 * ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChapterList,
  Drawer,
  EmptyState,
  Reader,
  Skeleton,
  useAsyncState,
  useReaderCache,
  useReaderSettings,
  type CachedChapter,
  type Chapter,
  type ChapterRef,
} from "@novel/components";
import { fetcher } from "@/api/fetcher";
import type { ChapterContent, ChapterSummary } from "@/api/types";
import { useHistoryStore } from "@/stores/historyStore";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useAdaptivePreloadRadius } from "@/hooks/useNetworkStatus";
import { markChapterStart, markChapterEnd } from "@/utils/perf";
import { SelectionPopover } from "@/components/SelectionPopover";
import "./ReaderPage.css";

/** 稳定的空数组引用：避免 `?? []` 每次 render 产生新引用导致 useMemo/useCallback 每帧重算 */
const EMPTY_CHAPTERS: ChapterSummary[] = [];

/** 把章节正文段落转为 HTML（首段为章节标题，跳过） */
function chapterToHtml(ch: ChapterContent): string {
  return ch.paragraphs
    .slice(1) // 首段是章节标题，Reader 已单独渲染
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}

export default function ReaderPage() {
  const { bookId = "", chapterId } = useParams();
  const navigate = useNavigate();
  const recordReading = useHistoryStore((s) => s.recordReading);
  const getEntry = useHistoryStore((s) => s.getEntry);
  const isBookmarked = useHistoryStore((s) => s.isBookmarked(bookId, chapterId ?? ""));
  const addBookmark = useHistoryStore((s) => s.addBookmark);
  const removeBookmark = useHistoryStore((s) => s.removeBookmark);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [chapterPercent, setChapterPercent] = useState(0);
  const readerContainerRef = useRef<HTMLDivElement>(null);

  const { settings, updateAll } = useReaderSettings();

  /* P7-6 离线缓存：章节正文 Cache-first（IndexedDB） */
  const offlineCache = useOfflineCache();
  /* P7-8 弱网降级：预加载半径收缩 */
  const preloadRadius = useAdaptivePreloadRadius(2);

  /* ---------- 章节目录 ---------- */
  const chaptersState = useAsyncState<ChapterSummary[]>(
    () => fetcher.getChapters(bookId),
    { deps: [bookId], initial: [] as ChapterSummary[], loadingDelay: 200 },
  );
  const chapters = chaptersState.data ?? EMPTY_CHAPTERS;

  const chapterRefs: ChapterRef[] = useMemo(
    () => chapters.map((c) => ({ id: c.id })),
    [chapters],
  );

  /* ---------- 章节获取器：先查 IDB 离线缓存，未命中请求网络并回写 ---------- */
  const chapterFetcher = useCallback(
    async (id: string): Promise<CachedChapter> => {
      // P7-6 Cache-first：离线命中直接返回
      const cached = await offlineCache.getChapter(bookId, id);
      if (cached) {
        return {
          id: cached.chapterId,
          title: cached.title,
          content: cached.content,
        };
      }
      const ch = await fetcher.getChapter(bookId, id);
      if (!ch) {
        // 章节不存在或 VIP 未解锁
        throw new Error("章节内容不可用");
      }
      const html = chapterToHtml(ch);
      // 回写离线缓存（不阻塞返回）
      void offlineCache.putChapter(bookId, ch.id, ch.title, html);
      return { id: ch.id, title: ch.title, content: html };
    },
    [bookId, offlineCache],
  );

  const cache = useReaderCache({
    fetcher: chapterFetcher,
    chapters: chapterRefs,
    maxCache: 5,
    preloadRadius,
  });

  /* 下一章预览数据（章节末卡片） */
  const nextChapterInfo = useMemo(() => {
    if (!chapters.length || !cache.nextId) return null;
    const nextIdx = chapters.findIndex((c) => c.id === cache.nextId);
    if (nextIdx < 0) return null;
    return { title: chapters[nextIdx]!.title };
  }, [chapters, cache.nextId]);

  /* 书签切换 */
  const handleBookmark = useCallback(
    (toggled: boolean) => {
      if (!chapterId) return;
      const ch = chapters.find((c) => c.id === chapterId);
      if (!ch) return;
      if (toggled) {
        addBookmark({
          bookId,
          chapterId,
          chapterTitle: ch.title,
          createdAt: Date.now(),
        });
      } else {
        removeBookmark(bookId, chapterId);
      }
    },
    [bookId, chapterId, chapters, addBookmark, removeBookmark],
  );

  /* P8-perf 章节切换耗时埋点：current 变化时 mark start/end */
  useEffect(() => {
    const current = cache.current;
    if (!current) return;
    markChapterStart(current.id);
    return () => {
      markChapterEnd(current.id);
    };
    // cache omitted: object recreated on every render, would cause effect re-run every frame
    // current.id 变化已作为依赖，切章埋点即可准确触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache.current?.id]);

  /* ---------- 初始章节定位：路由参数优先，其次恢复上次阅读进度 ---------- */
  useEffect(() => {
    if (chapters.length === 0) return;
    let target =
      chapterId && chapters.some((c) => c.id === chapterId)
        ? chapterId
        : undefined;
    // P1 进度记忆强化：无有效路由章节时，恢复该书上次阅读位置
    if (!target) {
      const entry = getEntry(bookId);
      if (entry && chapters.some((c) => c.id === entry.chapterId)) {
        target = entry.chapterId;
      }
    }
    cache.goto(target ?? chapters[0]!.id);
    // chapters omitted: reference changes on every fetch, would re-navigate to first chapter
    // cache omitted: object recreated on every render, would cause infinite re-runs
    // 仅在首次或路由参数变化时定位；cache.goto 内部已做去重
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, chapters.length]);

  /* ---------- 阅读历史记录 ---------- */
  useEffect(() => {
    if (!cache.current || cache.currentIndex < 0) return;
    const ch = chapters[cache.currentIndex];
    if (!ch) return;
    recordReading({
      bookId,
      chapterId: ch.id,
      chapterIndex: ch.index,
      chapterTitle: ch.title,
      percent: chapterPercent,
      readAt: Date.now(),
    });
    // 后端进度上报（与本地记录同步，fire-and-forget，失败不影响阅读）
    fetcher
      .reportReadingProgress({
        novelId: bookId,
        chapterId: ch.id,
        chapterIndex: ch.index,
        percent: chapterPercent,
      })
      .catch(() => {
        /* 进度上报失败静默忽略 */
      });
    // cache omitted: object recreated on every render; 依赖 cache.current 的 .id / .currentIndex 已覆盖切章场景
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cache.current?.id,
    bookId,
    chapters,
    cache.currentIndex,
    chapterPercent,
    recordReading,
  ]);

  /* ---------- 使用 ref 持有 cache，避免每次渲染导致回调重建 ---------- */
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const handlePrev = useCallback(() => {
    const c = cacheRef.current;
    if (c.prevId) {
      navigate(`/read/${bookId}/${c.prevId}`, { replace: true });
      c.goto(c.prevId);
      setChapterPercent(0);
    }
  }, [bookId, navigate]);

  const handleNext = useCallback(() => {
    const c = cacheRef.current;
    if (c.nextId) {
      navigate(`/read/${bookId}/${c.nextId}`, { replace: true });
      c.goto(c.nextId);
      setChapterPercent(0);
    }
  }, [bookId, navigate]);

  const handleBack = useCallback(() => {
    navigate(`/book/${bookId}`);
  }, [bookId, navigate]);

  const handleSelectChapter = useCallback(
    (ch: Chapter) => {
      setCatalogOpen(false);
      navigate(`/read/${bookId}/${ch.id}`, { replace: true });
      cacheRef.current.goto(ch.id);
      setChapterPercent(0);
    },
    [bookId, navigate],
  );

  /* ---------- 目录章节项 ---------- */
  const catalogChapters: Chapter[] = useMemo(
    () =>
      chapters.map((c) => ({
        id: c.id,
        title: c.title,
        wordCount: c.wordCount,
        isVip: c.isVip,
        updateTime: c.publishedAt,
        read: c.index < cacheRef.current.currentIndex + 1,
      })),
    [chapters],
  );

  /* ---------- 加载中 ---------- */
  if (chaptersState.loading && chapters.length === 0) {
    return (
      <div className="reader-page__loading" role="status">
        <Skeleton rows={8} />
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="reader-page__empty container-page">
        <EmptyState
          title="暂无章节"
          description="该书可能还在筹备中"
          action={
            <button
              type="button"
              className="reader-page__back-btn"
              onClick={handleBack}
            >
              返回详情
            </button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div ref={readerContainerRef} style={{ position: "relative" }}>
        <Reader
          key={cache.current?.id ?? "initial"}
          chapter={cache.current}
          loading={cache.loading}
          error={cache.error}
          currentIndex={
            cache.currentIndex >= 0 ? cache.currentIndex + 1 : undefined
          }
          totalChapters={chapters.length}
          chapterPercent={chapterPercent}
          settings={settings}
          onSettingsChange={updateAll}
          onPrev={cache.prevId ? handlePrev : undefined}
          onNext={cache.nextId ? handleNext : undefined}
          isBookmarked={isBookmarked}
          onBookmark={handleBookmark}
          nextChapterTitle={nextChapterInfo?.title}
          className="reader-page reader-page__chapter-enter"
        />
        <SelectionPopover bookId={bookId} chapterId={cache.current?.id ?? ""} />
      </div>

      {/* 目录抽屉 */}
      <Drawer
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        placement="right"
        title="目录"
        width={380}
      >
        <ChapterList
          chapters={catalogChapters}
          order="asc"
          activeId={cache.current?.id}
          onSelect={handleSelectChapter}
          virtual={chapters.length > 500}
          viewportHeight={Math.min(
            600,
            typeof window !== "undefined" ? window.innerHeight - 160 : 600,
          )}
        />
      </Drawer>
    </>
  );
}
