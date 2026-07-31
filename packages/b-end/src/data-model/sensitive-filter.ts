/* ============================================================
 * P8-1-2 · 敏感词过滤策略
 * - 统一扫描：stripHtml → 子串匹配 → 命中清单（带 offset）
 * - 三级过滤策略：一级 block 拦截保存 / 二级 require-audit 强制审核 / 三级 hint 仅提示
 * - 拆段渲染：splitContentBySensitive 供审核预览复用
 * 字数口径：与 word-count.ts 一致（含标点）
 * Source: 04 §13.1 / P8-1-1~3
 * ============================================================ */

import type { SensitiveLevel, SensitiveWord } from '../chapter-editor/sensitive-decorations.js';

/** 敏感词命中（带正文偏移，供高亮定位） */
export interface SensitiveHit {
  /** 命中文字 */
  text: string;
  /** 等级：1 严禁 / 2 警告 / 3 提示 */
  level: SensitiveLevel;
  /** 在纯文本中的起始偏移 */
  offset: number;
  /** 处理建议 */
  suggestion?: string;
}

/** 过滤动作（对应三级策略） */
export type FilterAction = 'block' | 'require-audit' | 'hint';

/** 等级 → 动作映射（P8-1-2） */
export const LEVEL_POLICY: Record<SensitiveLevel, FilterAction> = {
  1: 'block',
  2: 'require-audit',
  3: 'hint',
};

/** 等级元数据：配色 / 标签 / 默认建议（P8-1-3） */
export const SENSITIVE_LEVEL_META: Record<
  SensitiveLevel,
  { color: string; bg: string; label: string; action: FilterAction; defaultSuggestion: string }
> = {
  1: {
    color: 'var(--color-feedback-error)',
    bg: 'var(--color-feedback-error-bg)',
    label: '严禁',
    action: 'block',
    defaultSuggestion: '禁止发布，请删除或替换后重试',
  },
  2: {
    color: 'var(--color-feedback-warning)',
    bg: 'var(--color-feedback-warning-bg)',
    label: '警告',
    action: 'require-audit',
    defaultSuggestion: '可保存但需人工审核',
  },
  3: {
    color: 'var(--color-text-tertiary)',
    bg: 'var(--color-bg-subtle)',
    label: '提示',
    action: 'hint',
    defaultSuggestion: '建议自查，不影响发布',
  },
};

/** 取等级对应的过滤动作 */
export function getFilterAction(level: SensitiveLevel): FilterAction {
  return LEVEL_POLICY[level];
}

/** 剥离 HTML 标签，得到纯文本（与 word-count 口径一致） */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * 扫描纯文本/HTML，返回所有敏感词命中（按 offset 升序）。
 * 不区分大小写子串匹配；同一词多次出现分别返回。
 *
 * @param text 纯文本或 HTML（自动剥标签）
 * @param words 敏感词库
 */
export function scanText(text: string, words: readonly SensitiveWord[]): SensitiveHit[] {
  if (!words || words.length === 0 || !text) return [];
  const plain = stripHtml(text);
  const hits: SensitiveHit[] = [];
  for (const w of words) {
    if (!w.text) continue;
    const needle = w.text.toLowerCase();
    const hay = plain.toLowerCase();
    let from = hay.indexOf(needle);
    while (from !== -1) {
      hits.push({
        text: w.text,
        level: w.level,
        offset: from,
        suggestion: w.suggestion ?? SENSITIVE_LEVEL_META[w.level].defaultSuggestion,
      });
      from = hay.indexOf(needle, from + needle.length);
    }
  }
  return hits.sort((a, b) => a.offset - b.offset);
}

/**
 * 保存前校验：是否应拦截保存。
 * 一级（block）命中即拦截，返回首个拦截命中。
 */
export function shouldBlockSave(hits: readonly SensitiveHit[]): {
  blocked: boolean;
  firstBlockHit?: SensitiveHit;
} {
  const first = hits.find((h) => getFilterAction(h.level) === 'block');
  return { blocked: !!first, firstBlockHit: first };
}

/**
 * 是否存在需人工审核的命中（二级）。
 */
export function hasRequireAudit(hits: readonly SensitiveHit[]): boolean {
  return hits.some((h) => getFilterAction(h.level) === 'require-audit');
}

/** 内容拆段（供正文内高亮渲染） */
export interface ContentSegment {
  text: string;
  isHit: boolean;
  hit?: SensitiveHit;
}

/**
 * 将正文按敏感词命中拆分为高亮片段。
 * @param content 纯文本（需与 hits 的 offset 同口径，即 stripHtml 后）
 * @param hits 命中清单
 */
export function splitContentBySensitive(
  content: string,
  hits: readonly SensitiveHit[],
): ContentSegment[] {
  if (hits.length === 0) return [{ text: content, isHit: false }];
  const sorted = [...hits].sort((a, b) => a.offset - b.offset);
  const segments: ContentSegment[] = [];
  let cursor = 0;
  for (const hit of sorted) {
    if (hit.offset > cursor) {
      segments.push({ text: content.slice(cursor, hit.offset), isHit: false });
    }
    segments.push({
      text: content.slice(hit.offset, hit.offset + hit.text.length),
      isHit: true,
      hit,
    });
    cursor = hit.offset + hit.text.length;
  }
  if (cursor < content.length) {
    segments.push({ text: content.slice(cursor), isHit: false });
  }
  return segments;
}
