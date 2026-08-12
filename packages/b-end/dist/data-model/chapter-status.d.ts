import type { BChapterStatus } from "@novel/types";
export declare function canTransitionChapter(from: BChapterStatus, to: BChapterStatus): boolean;
export declare function transitionChapter(from: BChapterStatus, to: BChapterStatus): BChapterStatus;
export declare function nextChapterStatuses(from: BChapterStatus): BChapterStatus[];
//# sourceMappingURL=chapter-status.d.ts.map