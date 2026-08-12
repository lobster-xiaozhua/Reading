import { type Book } from "./BookCard.js";
export type RankBoardType = "hot" | "follow" | "ticket" | "new";
export interface RankItemType {
    book: Book;
    rank: number;
    prevRank: number;
}
export interface RankingBoardProps {
    items: RankItemType[];
    type?: RankBoardType;
    rankIcon?: boolean;
    maxCount?: number;
    onTabChange?: (type: RankBoardType) => void;
    onSelect?: (book: Book) => void;
    loading?: boolean;
    className?: string;
}
export declare function RankingBoard({ items, type, rankIcon, maxCount, onTabChange, onSelect, loading, className, }: RankingBoardProps): import("react").JSX.Element;
//# sourceMappingURL=RankingBoard.d.ts.map