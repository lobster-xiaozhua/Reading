/* ============================================================
 * P2-21 · BNovelStatus 合法转换校验
 * 转换图：draft → pending → published → offline → published（可恢复）
 *         draft → pending 不可逆（草稿提交审核后不能回退）
 * Source: 04-B端开发计划.md P2-21 / 04-B端专项设计.md §6.21
 * ============================================================ */
/** 合法转换映射表 */
const NOVEL_TRANSITIONS = {
    draft: ["pending"],
    pending: ["published", "draft"],
    published: ["offline"],
    offline: ["published"],
};
/** 校验状态转换是否合法 */
export function canTransitionNovel(from, to) {
    const allowed = NOVEL_TRANSITIONS[from] ?? [];
    return allowed.includes(to);
}
/** 执行状态转换，非法则抛错 */
export function transitionNovel(from, to) {
    if (!canTransitionNovel(from, to)) {
        throw new Error(`非法状态转换：${from} → ${to}（合法目标：${NOVEL_TRANSITIONS[from]?.join(" / ") ?? "无"}）`);
    }
    return to;
}
/** 获取某状态的合法后继 */
export function nextNovelStatuses(from) {
    return NOVEL_TRANSITIONS[from] ?? [];
}
//# sourceMappingURL=novel-status.js.map