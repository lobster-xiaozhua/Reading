export interface NotificationBadgeProps {
    /** 小说标题（单条模式必填） */
    novelTitle?: string;
    /** 新增章节数 */
    chapterCount?: number;
    /** 更新时间 */
    updateTime?: number | Date;
    /** 是否已读，默认 false（未读） */
    read?: boolean;
    /** 聚合条数：>0 时渲染「N 本书有更新」聚合卡片 */
    aggregateCount?: number;
    /** 点击整卡跳转最新章节 */
    onClick?: () => void;
    /** 忽略（标记已读） */
    onDismiss?: () => void;
    className?: string;
}
export declare function NotificationBadge({ novelTitle, chapterCount, updateTime, read, aggregateCount, onClick, onDismiss, className, }: NotificationBadgeProps): import("react").JSX.Element;
//# sourceMappingURL=NotificationBadge.d.ts.map