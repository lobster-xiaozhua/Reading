import { type ReactNode, type MouseEvent } from "react";
import { type Book } from "./BookCard.js";
export type BookshelfGroupBy = "none" | "status" | "tag";
export type BookshelfSortBy = "recent" | "title" | "update";
export type BookshelfViewMode = "grid" | "list";
export interface BookshelfTab {
    key: string;
    label: string;
}
export interface BookshelfProps {
    books: Book[];
    /** 分组方式，默认 none */
    groupBy?: BookshelfGroupBy;
    /** 排序方式，默认 recent */
    sortBy?: BookshelfSortBy;
    /** 视图模式，默认 grid */
    viewMode?: BookshelfViewMode;
    /** 顶部过滤 Tab：全部 / 连载 / 完结 / 最近阅读 */
    tabs?: BookshelfTab[];
    /** 当前激活 Tab key；未传时内部维护 */
    activeTab?: string;
    onTabChange?: (key: string) => void;
    onGroupByChange?: (groupBy: BookshelfGroupBy) => void;
    onSortByChange?: (sortBy: BookshelfSortBy) => void;
    onViewModeChange?: (viewMode: BookshelfViewMode) => void;
    /** 书架变更回调（移除书籍等） */
    onUpdate?: (books: Book[]) => void;
    /** 点击书籍卡片 */
    onBookClick?: (book: Book, e: MouseEvent<HTMLElement>) => void;
    /** loading 态：渲染骨架 grid */
    loading?: boolean;
    /** 空书架时的行动按钮（默认渲染「去发现好书」） */
    emptyAction?: ReactNode;
    className?: string;
}
export declare function Bookshelf({ books, groupBy: groupByProp, sortBy: sortByProp, viewMode: viewModeProp, tabs, activeTab: activeTabProp, onTabChange, onGroupByChange, onSortByChange, onViewModeChange, onUpdate, onBookClick, loading, emptyAction, className, }: BookshelfProps): import("react").JSX.Element;
//# sourceMappingURL=Bookshelf.d.ts.map