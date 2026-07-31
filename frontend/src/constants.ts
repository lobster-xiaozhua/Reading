import type { SortOption, TimeRangeOption } from "./types.ts";

export const SORTS: SortOption[] = [
  { value: "-updated_at", label: "最近更新" },
  { value: "updated_at", label: "最早更新" },
  { value: "-word_count", label: "字数最多" },
  { value: "word_count", label: "字数最少" },
  { value: "title", label: "书名" },
];

export const TIME_RANGES: TimeRangeOption[] = [
  { label: "全部", value: "" },
  { label: "近一周", value: "7d" },
  { label: "近一月", value: "30d" },
];

export function rangeToISO(days: string): string | null {
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(days, 10));
  return d.toISOString().slice(0, 19);
}