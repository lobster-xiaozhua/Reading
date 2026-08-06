/* ============================================================
 * P5-3 · 阅读器页
 * 路由 /read/:bookId/:chapterId?
 * 接入 useReaderCache（±2 预加载 / LRU 5）+ useReaderSettings
 * 章节切换 / 上下章 / 目录抽屉 / 阅读进度记录
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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function ReaderPage() {
  const { bookId = "", chapterId } = useParams();
  const navigate = useNavigate();
  const recordReading = useHistoryStore((s) => s.recordReading);
  const getEntry = useHistoryStore((s) => s.getEntry);
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
      if (!ch) throw new Error("章节不存在");
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

  /* ---------- 导航 ---------- */
  const handlePrev = useCallback(() => {
    if (cache.prevId) {
      navigate(`/read/${bookId}/${cache.prevId}`, { replace: true });
      cache.goto(cache.prevId);
      setChapterPercent(0);
    }
  }, [cache, bookId, navigate]);

  const handleNext = useCallback(() => {
    if (cache.nextId) {
      navigate(`/read/${bookId}/${cache.nextId}`, { replace: true });
      cache.goto(cache.nextId);
      setChapterPercent(0);
    }
  }, [cache, bookId, navigate]);

  const handleSeek = useCallback(
    (chapterNum: number) => {
      const target = chapters[chapterNum - 1];
      if (target) {
        navigate(`/read/${bookId}/${target.id}`, { replace: true });
        cache.goto(target.id);
        setChapterPercent(0);
      }
    },
    [chapters, bookId, navigate, cache],
  );

  const handleBack = useCallback(() => {
    navigate(`/book/${bookId}`);
  }, [bookId, navigate]);

  const handleSelectChapter = useCallback(
    (ch: Chapter) => {
      setCatalogOpen(false);
      navigate(`/read/${bookId}/${ch.id}`, { replace: true });
      cache.goto(ch.id);
      setChapterPercent(0);
    },
    [bookId, navigate, cache],
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
        read: c.index < cache.currentIndex + 1,
      })),
    [chapters, cache.currentIndex],
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
          onSeek={handleSeek}
          onCatalog={() => setCatalogOpen(true)}
          onBack={handleBack}
          onProgress={setChapterPercent}
          className="reader-page"
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
