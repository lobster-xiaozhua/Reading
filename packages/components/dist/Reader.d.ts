import { type ReactNode } from "react";
import { type ReaderSettings as ReaderSettingsValue } from "./useReaderSettings.js";
export interface ReaderChapter {
    id: string;
    title: string;
    /** 章节正文 HTML（段落以 <p> 包裹） */
    content: string;
}
export interface ReaderProps {
    /** 当前章节（外部受控传入；不传时配合 useReaderCache 内部管理） */
    chapter: ReaderChapter | null;
    /** 章节加载中 */
    loading?: boolean;
    /** 章节加载错误 */
    error?: Error | null;
    /** 当前章节序号（1-based） */
    currentIndex?: number;
    /** 总章节数 */
    totalChapters?: number;
    /** 当前章节内阅读进度 0-100 */
    chapterPercent?: number;
    /** 阅读设置 */
    settings: ReaderSettingsValue;
    /** 设置变更回调 */
    onSettingsChange: (next: ReaderSettingsValue) => void;
    /** 上一章；为 null 时禁用按钮 */
    onPrev?: () => void;
    /** 下一章；为 null 时禁用按钮 */
    onNext?: () => void;
    /** 章节跳转（序号 1-based），用于 ReadingProgress seek */
    onSeek?: (chapter: number) => void;
    /** 目录按钮回调 */
    onCatalog?: () => void;
    /** 返回回调 */
    onBack?: () => void;
    /** 进度回调（章节内滚动位置变化） */
    onProgress?: (percent: number) => void;
    /** 是否禁用拖拽进度（H5 默认禁用），默认 false */
    disableSeek?: boolean;
    /** 自定义顶部栏右侧内容（替代默认设置按钮） */
    topBarExtra?: ReactNode;
    /** 当前章节是否已书签 */
    isBookmarked?: boolean;
    /** 切换书签回调 */
    onBookmark?: (toggled: boolean) => void;
    /** 下一章标题（用于章节末预览卡） */
    nextChapterTitle?: string;
    /** 下一章预览文字（前 200 字） */
    nextChapterPreview?: string;
    /** 翻页模式 */
    className?: string;
}
export declare function Reader({ chapter, loading, error, currentIndex, totalChapters, chapterPercent, settings, onSettingsChange, onPrev, onNext, onSeek, onCatalog, onBack, onProgress, disableSeek, topBarExtra, isBookmarked, onBookmark, nextChapterTitle, nextChapterPreview, className, }: ReaderProps): import("react").JSX.Element;
//# sourceMappingURL=Reader.d.ts.map