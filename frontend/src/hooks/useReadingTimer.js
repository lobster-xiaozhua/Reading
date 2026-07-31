import { useEffect, useRef, useCallback } from "react";
import { saveReadingProgress } from "../lib/localLibrary.js";
import { apiSaveProgress, getToken } from "../api.ts";

/**
 * 阅读计时 + 进度保存 hook
 * 每 30 秒自动保存阅读进度到本地和云端
 * 使用 ref 持有可变值，避免因 pageIndex 等变化频繁重启计时器
 */
export function useReadingTimer({ bookId, chapterId, chapter, mode, pageIndex, fontSize, scrollRef }) {
  const readingMinutes = useRef(0);

  // 用 ref 持有可变值，避免计时器因 pageIndex 变化重启
  const modeRef = useRef(mode);
  const pageIndexRef = useRef(pageIndex);
  const fontSizeRef = useRef(fontSize);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { pageIndexRef.current = pageIndex; }, [pageIndex]);
  useEffect(() => { fontSizeRef.current = fontSize; }, [fontSize]);

  useEffect(() => {
    if (!chapter) return;
    readingMinutes.current = 0;

    const timer = setInterval(() => {
      readingMinutes.current += 0.5;
      const el = scrollRef.current;
      if (!el || !chapter) return;

      let ratio = 0;
      if (modeRef.current === "page") {
        const PAGE_SIZE = Math.max(1, Math.floor(40 / (fontSizeRef.current / 16)));
        const totalPages = Math.max(1, Math.ceil(chapter.paragraphs.length / PAGE_SIZE));
        ratio = pageIndexRef.current / Math.max(1, totalPages - 1);
      } else {
        ratio = el.scrollHeight > el.clientHeight
          ? el.scrollTop / (el.scrollHeight - el.clientHeight)
          : 0;
      }

      // 本地保存
      saveReadingProgress({
        bookId, chapterId, title: chapter.title,
        bookTitle: chapter.book_title, scrollTop: el.scrollTop || 0, progress: ratio,
      });

      // 云端同步
      const token = getToken();
      if (token) {
        apiSaveProgress({
          book_id: bookId, chapter_id: chapterId,
          scroll_top: el.scrollTop || 0, progress: ratio,
          minutes: Math.floor(readingMinutes.current),
        }).catch(() => {});
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [chapter, bookId, chapterId]);

  return readingMinutes;
}