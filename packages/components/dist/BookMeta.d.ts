import type { MouseEvent } from "react";
import { type ContentStatusType } from "./ContentStatus.js";
export interface BookMetaProps {
    title: string;
    author: string;
    wordCount?: number;
    chapterCount?: number;
    status?: ContentStatusType;
    updatedAt?: string | number | Date;
    tags?: string[];
    size?: "compact" | "detailed";
    onClick?: (e: MouseEvent<HTMLElement>) => void;
}
export declare function BookMeta({ title, author, wordCount, chapterCount, status, updatedAt, tags, size, onClick, }: BookMetaProps): import("react").JSX.Element;
//# sourceMappingURL=BookMeta.d.ts.map