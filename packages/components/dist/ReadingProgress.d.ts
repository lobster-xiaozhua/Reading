export interface ReadingProgressProps {
    /** 当前章节序号（1-based） */
    current: number;
    /** 总章节数 */
    total: number;
    /** 当前章节内进度 0-100 */
    percent: number;
    /** 是否显示章节信息「第 N 章 / 共 M 章」，默认 true */
    showChapter?: boolean;
    /** 拖拽/点击跳转章节（章节序号 1-based）；未提供时 H5 只读模式 */
    onSeek?: (chapter: number) => void;
    /** 是否禁用拖拽（H5 默认禁用，桌面可启用），默认 false */
    disableSeek?: boolean;
    className?: string;
}
export declare function ReadingProgress({ current, total, percent, showChapter, onSeek, disableSeek, className, }: ReadingProgressProps): import("react").JSX.Element;
//# sourceMappingURL=ReadingProgress.d.ts.map