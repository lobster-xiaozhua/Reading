/* ============================================================
 * P8-1-1 · 敏感词库 Mock API
 * - 三级分级：1 严禁（涉政/涉黄）/ 2 警告（暴力/广告）/ 3 提示（俗语/敏感谐音）
 * - 版本号对接 fetcher.system.getConfig.sensitiveWordLibVersion
 * Source: 04 §13.1 / P8-1-1
 * ============================================================ */

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

/** 默认敏感词库（mock，真实环境由后端下发） */
const DEFAULT_LIB: SensitiveWord[] = [
  // 一级 严禁
  { text: '违禁药品', level: 1, suggestion: '涉政敏感词，建议删除或替换为「丹药」' },
  { text: '神秘组织', level: 1, suggestion: '涉政敏感词，建议替换为「帮派」或「门派」' },
  { text: '反动', level: 1, suggestion: '涉政敏感词，禁止发布' },
  { text: '色情', level: 1, suggestion: '涉黄敏感词，禁止发布' },
  // 二级 警告
  { text: '毒酒', level: 2, suggestion: '暴力元素，建议弱化描写' },
  { text: '血液染红', level: 2, suggestion: '暴力描写，建议改为「汗水湿透」' },
  { text: '加微信', level: 2, suggestion: '广告引流，建议删除' },
  { text: 'QQ群', level: 2, suggestion: '广告引流，建议删除' },
  // 三级 提示
  { text: '敌军压境', level: 3, suggestion: '可人工判断，建议保留但留意上下文' },
  { text: '该死', level: 3, suggestion: '俗语，建议自查上下文' },
  { text: '见鬼', level: 3, suggestion: '敏感谐音，建议自查' },
];

let CURRENT_LIB: SensitiveWord[] = DEFAULT_LIB;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** 拉取敏感词库（含元信息） */
export async function fetchSensitiveWordLib(): Promise<{
  words: SensitiveWord[];
  meta: SensitiveWordLibMeta;
}> {
  await delay(200);
  const byLevel: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  CURRENT_LIB.forEach((w) => {
    byLevel[w.level]++;
  });
  return {
    words: [...CURRENT_LIB],
    meta: {
      version: '2026.07.31',
      updatedAt: Date.now(),
      totalCount: CURRENT_LIB.length,
      byLevel,
    },
  };
}

/** 新增敏感词（mock 本地写入） */
export async function addSensitiveWord(word: SensitiveWord): Promise<{ success: boolean }> {
  await delay(150);
  if (CURRENT_LIB.some((w) => w.text === word.text && w.level === word.level)) {
    return { success: false };
  }
  CURRENT_LIB = [...CURRENT_LIB, word];
  return { success: true };
}

/** 删除敏感词（mock 本地写入） */
export async function removeSensitiveWord(text: string, level: 1 | 2 | 3): Promise<{ success: boolean }> {
  await delay(150);
  const before = CURRENT_LIB.length;
  CURRENT_LIB = CURRENT_LIB.filter((w) => !(w.text === text && w.level === level));
  return { success: CURRENT_LIB.length < before };
}
