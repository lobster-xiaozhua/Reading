import type { AuditResult, RejectReason } from "@novel/types";
import { type SensitiveHit } from "../data-model/sensitive-filter.js";
export interface ReviewItem {
    id: string;
    /** 章节标题 */
    title: string;
    /** 作者 */
    author: string;
    /** 章节正文预览（HTML 或纯文本） */
    content: string;
    /** 敏感词命中列表 */
    sensitiveWords?: {
        text: string;
        level: 1 | 2 | 3;
    }[];
    /**
     * 敏感词命中清单（含 offset，P8-1-5）。
     * 提供时正文将以纯文本形式渲染并内联高亮命中段；
     * 未提供时回退到 dangerouslySetInnerHTML 渲染 HTML。
     */
    sensitiveHits?: SensitiveHit[];
}
export interface ReviewHistoryEntry {
    /** 操作时间 */
    time: string;
    /** 操作人 */
    operator: string;
    /** 审核结果 */
    result: AuditResult;
    /** 审核意见 */
    comment?: string;
    /** 驳回原因分类 */
    rejectReason?: RejectReason;
}
export interface BContentReviewProps {
    /** 单条审核项（single 模式） */
    item?: ReviewItem;
    /** 批量审核项列表（batch 模式） */
    items?: ReviewItem[];
    /** 模式 */
    mode?: "single" | "batch";
    /** 审核历史 */
    history?: ReviewHistoryEntry[];
    /** 通过回调 */
    onApprove?: (ids: string[], comment: string) => void;
    /** 待修改回调 */
    onRevise?: (ids: string[], comment: string) => void;
    /** 驳回回调 */
    onReject?: (ids: string[], reason: RejectReason, comment: string) => void;
}
/**
 * B 端内容审核流程组件
 * - 单条/批量模式
 * - 驳回必填原因分类 + 说明 ≥10 字
 * - 审核历史 Timeline
 */
export declare const BContentReview: import("react").ForwardRefExoticComponent<BContentReviewProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=BContentReview.d.ts.map