/* ============================================================
 * P2-21 · BChapterStatus 合法转换校验
 * 转换图：draft → pending → published → offline → published（可恢复）
 *         草稿→待审核不可逆
 * Source: 04-B端开发计划.md P2-21
 * ============================================================ */
const CHAPTER_TRANSITIONS = {
    draft: ["pending"],
    pending: ["published", "draft"],
    published: ["offline"],
    offline: ["published"],
};
export function canTransitionChapter(from, to) {
    const allowed = CHAPTER_TRANSITIONS[from] ?? [];
    return allowed.includes(to);
}
export function transitionChapter(from, to) {
    if (!canTransitionChapter(from, to)) {
        throw new Error(`非法章节状态转换：${from} → ${to}`);
    }
    return to;
}
export function nextChapterStatuses(from) {
    return CHAPTER_TRANSITIONS[from] ?? [];
}
//# sourceMappingURL=chapter-status.js.map