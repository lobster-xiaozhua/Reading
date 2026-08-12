import type { BNovelStatus } from "@novel/types";
/** 校验状态转换是否合法 */
export declare function canTransitionNovel(from: BNovelStatus, to: BNovelStatus): boolean;
/** 执行状态转换，非法则抛错 */
export declare function transitionNovel(from: BNovelStatus, to: BNovelStatus): BNovelStatus;
/** 获取某状态的合法后继 */
export declare function nextNovelStatuses(from: BNovelStatus): BNovelStatus[];
//# sourceMappingURL=novel-status.d.ts.map