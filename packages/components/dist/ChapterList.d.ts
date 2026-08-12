/** 章节领域模型 */
export interface Chapter {
    id: string;
    title: string;
    wordCount?: number;
    updateTime?: string | number | Date;
    /** 是否 VIP 章节 */
    isVip?: boolean;
    /** 是否已读 */
    read?: boolean;
}
export type ChapterOrder = "asc" | "desc";
export interface ChapterListProps {
    chapters: Chapter[];
    /** 正序 / 倒序，默认 asc */
    order?: ChapterOrder;
    /** 当前阅读章节 id（高亮） */
    activeId?: string;
    onSelect?: (chapter: Chapter) => void;
    /** 启用虚拟滚动（章节数 >500 时开启） */
    virtual?: boolean;
    /** 虚拟滚动视口高度（px），默认 600 */
    viewportHeight?: number;
    /** 是否显示 VIP 标记，默认 true */
    showVip?: boolean;
    /** 倒序切换回调；提供时渲染排序切换按钮 */
    onOrderChange?: (order: ChapterOrder) => void;
    /** 加载更多回调；提供且 hasMore 时显示「加载更多」 */
    onLoadMore?: () => void;
    /** 是否还有更多 */
    hasMore?: boolean;
    /** 加载更多进行中 */
    loading?: boolean;
    className?: string;
}
export declare function ChapterList({ chapters, order, activeId, onSelect, virtual, viewportHeight, showVip, onOrderChange, onLoadMore, hasMore, loading, className, }: ChapterListProps): import("react").JSX.Element;
//# sourceMappingURL=ChapterList.d.ts.map