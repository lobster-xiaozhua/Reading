/* ============================================================
 * P2-21 · BChapterStatus 合法转换校验
 * 转换图：draft → pending → published → offline → published（可恢复）
 *         草稿→待审核不可逆
 * Source: 04-B端开发计划.md P2-21
 * ============================================================ */

import type { BChapterStatus } from '@novel/types';

const CHAPTER_TRANSITIONS: Record<BChapterStatus, BChapterStatus[]> = {
  draft: ['pending'],
  pending: ['published', 'draft'],
  published: ['offline'],
  offline: ['published'],
};

export function canTransitionChapter(from: BChapterStatus, to: BChapterStatus): boolean {
  const allowed = CHAPTER_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function transitionChapter(from: BChapterStatus, to: BChapterStatus): BChapterStatus {
  if (!canTransitionChapter(from, to)) {
    throw new Error(`非法章节状态转换：${from} → ${to}`);
  }
  return to;
}

export function nextChapterStatuses(from: BChapterStatus): BChapterStatus[] {
  return CHAPTER_TRANSITIONS[from] ?? [];
}
