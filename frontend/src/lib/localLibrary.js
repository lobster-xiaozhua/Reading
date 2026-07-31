/** 本地阅读数据：进度、书架、书签、划线高亮（纯 localStorage，无需后端） */
const HISTORY_KEY = "novel:history";
const SHELF_KEY = "novel:shelf";
const BOOKMARKS_KEY = "novel:bookmarks";
const HIGHLIGHTS_KEY = "novel:highlights";
const MAX_HISTORY = 40;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function getHistory() {
  const list = readJson(HISTORY_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function getBookProgress(bookId) {
  return getHistory().find((h) => h.bookId === bookId) || null;
}

export function saveReadingProgress({
  bookId,
  chapterId,
  title = "",
  bookTitle = "",
  scrollTop = 0,
  progress = 0,
}) {
  if (!bookId || !chapterId) return;
  const list = getHistory().filter((h) => h.bookId !== bookId);
  list.unshift({
    bookId,
    chapterId,
    title,
    bookTitle,
    scrollTop,
    progress,
    at: new Date().toISOString(),
  });
  writeJson(HISTORY_KEY, list.slice(0, MAX_HISTORY));
}

export function clearHistory() {
  writeJson(HISTORY_KEY, []);
}

export function getShelf() {
  const list = readJson(SHELF_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function isOnShelf(bookId) {
  return getShelf().some((b) => b.bookId === bookId);
}

export function toggleShelf(book) {
  if (!book?.id) return false;
  const list = getShelf();
  const idx = list.findIndex((b) => b.bookId === book.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeJson(SHELF_KEY, list);
    return false;
  }
  list.unshift({
    bookId: book.id,
    title: book.title || book.id,
    author: book.author || "",
    cover: book.cover || null,
    tags: book.tags || [],
    at: new Date().toISOString(),
  });
  writeJson(SHELF_KEY, list);
  return true;
}

export function removeFromShelf(bookId) {
  writeJson(
    SHELF_KEY,
    getShelf().filter((b) => b.bookId !== bookId)
  );
}

export function getBookmarks(bookId) {
  const all = readJson(BOOKMARKS_KEY, {});
  const list = all[bookId] || [];
  return Array.isArray(list) ? list : [];
}

export function addBookmark({ bookId, chapterId, title = "", scrollTop = 0, note = "" }) {
  if (!bookId || !chapterId) return;
  const all = readJson(BOOKMARKS_KEY, {});
  const list = Array.isArray(all[bookId]) ? all[bookId] : [];
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  list.unshift({
    id,
    chapterId,
    title,
    scrollTop,
    note,
    at: new Date().toISOString(),
  });
  all[bookId] = list.slice(0, 50);
  writeJson(BOOKMARKS_KEY, all);
  return id;
}

export function removeBookmark(bookId, bookmarkId) {
  const all = readJson(BOOKMARKS_KEY, {});
  all[bookId] = (all[bookId] || []).filter((b) => b.id !== bookmarkId);
  writeJson(BOOKMARKS_KEY, all);
}

export function getAllBookmarks() {
  const all = readJson(BOOKMARKS_KEY, {});
  const result = [];
  for (const bookId of Object.keys(all)) {
    const list = all[bookId] || [];
    list.forEach((bm) => {
      result.push({ ...bm, bookId });
    });
  }
  return result.sort((a, b) => new Date(b.at) - new Date(a.at));
}

/** 本地阅读统计 */
export function getLocalStats() {
  const history = getHistory();
  const shelf = getShelf();
  const allBm = getAllBookmarks();
  const totalMinutes = Math.round(history.reduce((s, h) => s + (h.minutes || 0), 0));
  // 粗略估算：每章 5 分钟
  const totalChapters = history.length;
  return {
    total_minutes: totalMinutes,
    total_chapters: totalChapters,
    total_books: history.length,
    total_bookmarks: allBm.length,
    total_shelf: shelf.length,
  };
}

/**
 * 划线高亮功能
 */
export function getHighlights(bookId, chapterId) {
  const all = readJson(HIGHLIGHTS_KEY, {});
  const key = `${bookId}:${chapterId}`;
  return Array.isArray(all[key]) ? all[key] : [];
}

export function getAllHighlights(bookId) {
  const all = readJson(HIGHLIGHTS_KEY, {});
  const result = [];
  for (const key of Object.keys(all)) {
    if (key.startsWith(`${bookId}:`)) {
      result.push(...all[key].map((h) => ({ ...h, chapterId: key.split(":")[1] })));
    }
  }
  return result.sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function addHighlight({ bookId, chapterId, text, note = "", color = "yellow" }) {
  if (!bookId || !chapterId || !text) return;
  const all = readJson(HIGHLIGHTS_KEY, {});
  const key = `${bookId}:${chapterId}`;
  const list = Array.isArray(all[key]) ? all[key] : [];
  // 去重：同一段落同一文本不重复划线
  if (list.some((h) => h.text === text)) return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  list.unshift({ id, text, note, color, at: new Date().toISOString() });
  all[key] = list.slice(0, 100);
  writeJson(HIGHLIGHTS_KEY, all);
  return id;
}

export function removeHighlight(bookId, chapterId, highlightId) {
  const all = readJson(HIGHLIGHTS_KEY, {});
  const key = `${bookId}:${chapterId}`;
  all[key] = (all[key] || []).filter((h) => h.id !== highlightId);
  writeJson(HIGHLIGHTS_KEY, all);
}

export function updateHighlightNote(bookId, chapterId, highlightId, note) {
  const all = readJson(HIGHLIGHTS_KEY, {});
  const key = `${bookId}:${chapterId}`;
  const list = all[key] || [];
  const h = list.find((h) => h.id === highlightId);
  if (h) h.note = note;
  all[key] = list;
  writeJson(HIGHLIGHTS_KEY, all);
}

export function formatRelative(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return iso.slice(0, 10);
}
