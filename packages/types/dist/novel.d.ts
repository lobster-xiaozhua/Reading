import type { BookFlag } from "./enums.js";
/** 跨端共享：书籍基础字段（C/B 端一致） */
export interface NovelBase {
    id: string;
    title: string;
    author: string;
    cover: string;
    category: string;
    tags: string[];
    wordCount: number;
    intro: string;
    /** 最近更新时间戳（ms） */
    lastUpdated: number;
}
/** C 端阅读侧状态（只关心是否完结） */
export type CNovelStatus = "ongoing" | "completed";
/** B 端运营侧状态（含完整生命周期） */
export type BNovelStatus = "draft" | "pending" | "published" | "offline";
/** C 端书籍摘要 = NovelBase + C 端状态 + 读者侧统计 */
export interface CNovelSummary extends NovelBase {
    status: CNovelStatus;
    flags: BookFlag[];
    rating: number;
    ratingCount: number;
    followCount: number;
    clickCount: number;
}
/** B 端书籍详情 = NovelBase + B 端状态 + 运营侧字段 */
export interface BNovelDetail extends NovelBase {
    status: BNovelStatus;
    /** 是否完结（0 连载中 1 完结） */
    isCompleted: boolean;
    authorId: string;
    /** 上架时间戳（未上架为 null） */
    publishedAt: number | null;
    /** 下架时间戳（未下架为 null） */
    shelvedAt: number | null;
    /** 下架/驳回原因 */
    reason?: string;
    /** 创建时间戳 */
    createdAt: number;
}
/** 章节基础字段（跨端共享） */
export interface ChapterBase {
    id: string;
    bookId: string;
    index: number;
    title: string;
    wordCount: number;
    isVip: boolean;
    publishedAt: number;
}
/** B 端章节状态（C 端不关心） */
export type BChapterStatus = "draft" | "pending" | "published" | "offline";
/** B 端章节详情 = ChapterBase + B 端状态 + 正文 */
export interface BChapterDetail extends ChapterBase {
    status: BChapterStatus;
    /** HTML 正文 */
    content: string;
    /** 纯文字字数（不含标点） */
    pureWordCount: number;
    /** 含标点字数（稿费口径） */
    punctuationWordCount: number;
    createdAt: number;
    updatedAt: number;
}
