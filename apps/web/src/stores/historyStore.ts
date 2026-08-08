/* ============================================================
 * 兼容层：historyStore 重定向到 atlasStore
 * ============================================================ */
export { useAtlasStore as useHistoryStore } from "./atlasStore";
export type { HistoryEntry, BookmarkEntry } from "./atlasStore";
