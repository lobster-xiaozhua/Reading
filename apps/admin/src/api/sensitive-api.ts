/* ============================================================
 * P8-1-1 · 敏感词库 API：对接后端 /sensitive-words 真实接口
 * - 三级分级：1 严禁（涉政/涉黄）/ 2 警告（暴力/广告）/ 3 提示（俗语/敏感谐音）
 * - 版本号由后端词库管理
 * Source: 04 §13.1 / P8-1-1
 * ============================================================ */

import { http, requestSafe } from './http';
import type { SensitiveWord } from '@novel/b-end';

/** 敏感词库元信息 */
export interface SensitiveWordLibMeta {
  /** 库版本号 */
  version: string;
  /** 更新时间戳 */
  updatedAt: number;
  /** 词条总数 */
  totalCount: number;
  /** 分级统计 */
  byLevel: Record<1 | 2 | 3, number>;
}

interface BackendSensitiveWord {
  id: string;
  text: string;
  level: number;
  suggestion?: string;
  libVersion?: string;
}

interface BackendSensitiveWordLib {
  words: BackendSensitiveWord[];
  meta: {
    version: string;
    updatedAt: number;
    totalCount: number;
    byLevel: Record<string, number>;
  };
}

function toByLevel(byLevel: Record<string, number>): Record<1 | 2 | 3, number> {
  const out: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  Object.entries(byLevel ?? {}).forEach(([k, v]) => {
    const n = Number(k);
    if (n === 1 || n === 2 || n === 3) out[n] = v;
  });
  return out;
}

/** 拉取敏感词库（含元信息） */
export async function fetchSensitiveWordLib(): Promise<{
  words: SensitiveWord[];
  meta: SensitiveWordLibMeta;
}> {
  const data = await http.get<BackendSensitiveWordLib>('/sensitive-words');
  return {
    words: (data.words ?? []).map((w) => ({
      text: w.text,
      level: (w.level as SensitiveWord['level']) || 3,
      suggestion: w.suggestion,
    })),
    meta: {
      version: data.meta?.version ?? '',
      updatedAt: data.meta?.updatedAt ?? Date.now(),
      totalCount: data.meta?.totalCount ?? data.words?.length ?? 0,
      byLevel: toByLevel(data.meta?.byLevel),
    },
  };
}

/** 新增敏感词 */
export async function addSensitiveWord(word: SensitiveWord): Promise<{ success: boolean }> {
  const result = await requestSafe(http.post('/sensitive-words', {
    text: word.text,
    level: word.level,
    suggestion: word.suggestion ?? '',
  }));
  if (result.success) return { success: true };
  return { success: false };
}

/** 删除敏感词 */
export async function removeSensitiveWord(
  text: string,
  level: 1 | 2 | 3,
): Promise<{ success: boolean }> {
  const result = await requestSafe(http.del(`/sensitive-words?text=${encodeURIComponent(text)}&level=${level}`));
  if (result.success) return { success: true };
  return { success: false };
}
