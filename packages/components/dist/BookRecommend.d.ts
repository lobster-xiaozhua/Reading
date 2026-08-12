import { type Book } from "./BookCard.js";
export interface RecommendBookItem {
    book: Book;
    /** 匹配度 0-100 */
    matchScore: number;
}
export interface BookRecommendProps {
    title?: string;
    books: RecommendBookItem[];
    loading?: boolean;
    onRefresh?: () => void;
    onSelect?: (book: Book) => void;
    className?: string;
}
export declare function BookRecommend({ title, books, loading, onRefresh, onSelect, className, }: BookRecommendProps): import("react").JSX.Element;
//# sourceMappingURL=BookRecommend.d.ts.map