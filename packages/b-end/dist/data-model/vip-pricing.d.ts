import type { ContractType } from "@novel/types";
/** 买断模式参数 */
export interface BuyoutParams {
    type: "buyout";
    /** 单价（书币/千字），≥ 0 */
    pricePerKWord: number;
    /** 字数（含标点口径） */
    wordCount: number;
}
/** 分成模式参数 */
export interface ShareParams {
    type: "share";
    /** 分成比例 0~1 */
    shareRate: number;
    /** 订阅收入 */
    subscriptionRevenue: number;
}
/** 保底+分成模式参数 */
export interface GuaranteeShareParams {
    type: "guarantee-share";
    /** 保底金额 ≥ 0 */
    guarantee: number;
    /** 分成比例 0~1 */
    shareRate: number;
    /** 订阅收入 */
    subscriptionRevenue: number;
}
export type PricingParams = BuyoutParams | ShareParams | GuaranteeShareParams;
export interface PricingResult {
    /** 结算金额（书币） */
    amount: number;
    /** 校验是否通过 */
    valid: boolean;
    /** 校验错误信息 */
    errors: string[];
}
/** 校验参数合法性 */
export declare function validatePricing(params: PricingParams): string[];
/**
 * 计算稿费金额
 * - 买断：ceil(字数/1000) × 单价
 * - 分成：订阅收入 × 分成比例
 * - 保底+分成：max(保底, 订阅 × 分成)
 */
export declare function calculateRoyalty(params: PricingParams): PricingResult;
/** 获取签约模式中文名 */
export declare function getContractTypeName(type: ContractType): string;
//# sourceMappingURL=vip-pricing.d.ts.map