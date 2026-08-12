import { type MouseEvent } from "react";
/** 书籍领域模型（C 端通用，P3+ 页面复用） */
export interface Book {
    id: string;
    title: string;
    author: string;
    cover?: string;
    tags?: string[];
    intro?: string;
    rating?: number;
    /** 书架内标记：是否已加入书架 */
    added?: boolean;
    /** 是否有更新（书架场景，触发右上角红点） */
    hasUpdate?: boolean;
    /** 内容状态（书架分组排序用） */
    status?: "ongoing" | "completed" | "paused" | "reviewing" | "offline";
    /** 上次阅读时间（毫秒时间戳）； sortBy=recent / list 视图「上次阅读」展示 */
    lastReadTime?: number;
    /** 阅读进度 0-1；list 视图展示进度条 */
    progress?: number;
    /** 未读章节数（书架追更红点 + NotificationBadge 文案） */
    unreadChapters?: number;
    /** 最近更新时间（毫秒时间戳）；sortBy=update 用 */
    updateTime?: number;
}
export type BookCardVariant = "grid" | "list" | "horizontal";
export type BookCardSize = "sm" | "md" | "lg";
export interface BookCardProps {
    book: Book;
    variant?: BookCardVariant;
    size?: BookCardSize;
    /** 是否显示评分，默认 true */
    showRating?: boolean;
    /** 是否显示简介；list 变体默认 true，其余默认 false */
    showIntro?: boolean;
    /** 额外标签覆盖 book.tags */
    tags?: string[];
    /** loading 态：渲染骨架屏 */
    loading?: boolean;
    onClick?: (book: Book, e: MouseEvent<HTMLElement>) => void;
    className?: string;
}
export declare const BookCard: import("react").NamedExoticComponent<BookCardProps>;
//# sourceMappingURL=BookCard.d.ts.map