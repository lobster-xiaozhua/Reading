import type { ContractType, SettlementStatus } from "@novel/types";
/** 作者信息 */
export interface AuthorInfo {
    id: string;
    name: string;
    avatar: string;
    penName: string;
    /** 签约状态 */
    contractStatus: "active" | "terminated" | "pending";
    /** 合同到期时间戳（ms） */
    contractExpireAt: number;
    /** 签约模式 */
    contractType: ContractType;
    /** 累计字数 */
    totalWords: number;
    /** 作品数 */
    workCount: number;
}
/** 作者作品摘要 */
export interface AuthorWork {
    id: string;
    title: string;
    category: string;
    wordCount: number;
    status: "published" | "offline" | "draft";
    lastUpdated: number;
}
/** 合同信息 */
export interface ContractInfo {
    type: ContractType;
    /** 签约日期 */
    signedAt: string;
    /** 到期日期 */
    expireAt: string;
    /** 到期时间戳 */
    expireTimestamp: number;
    /** 分成比例或单价 */
    terms: string;
    status: "active" | "expired" | "terminated";
}
/** 收益统计 */
export interface RoyaltyStat {
    /** 本月收益 */
    monthly: number;
    /** 累计收益 */
    total: number;
    /** 待结算 */
    pending: number;
    /** 结算状态 */
    settlementStatus: SettlementStatus;
}
export interface BAuthorManagerProps {
    /** 作者信息 */
    author: AuthorInfo;
    /** 作品列表 */
    works: AuthorWork[];
    /** 合同信息 */
    contract: ContractInfo;
    /** 收益统计 */
    royalty: RoyaltyStat;
}
/**
 * B 端作者档案与合同管理
 * - 作者信息卡（头像 + 笔名 + 签约状态）
 * - 合同 Descriptions（到期前 30 天高亮 warning）
 * - 收益 StatisticCard ×3（本月/累计/待结算）
 * - 作品列表 Table（解约作者作品置灰仍可查）
 */
export declare const BAuthorManager: import("react").ForwardRefExoticComponent<BAuthorManagerProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=BAuthorManager.d.ts.map