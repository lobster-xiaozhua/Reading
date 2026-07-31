/* ============================================================
 * P2-21 · VIP 定价约束校验
 * 三种签约模式：买断 / 分成 / 保底+分成
 * Source: 04-B端开发计划.md P2-21 / P8-2-1 签约模式
 * ============================================================ */

import type { ContractType } from '@novel/types';

/** 买断模式参数 */
export interface BuyoutParams {
  type: 'buyout';
  /** 单价（书币/千字），≥ 0 */
  pricePerKWord: number;
  /** 字数（含标点口径） */
  wordCount: number;
}

/** 分成模式参数 */
export interface ShareParams {
  type: 'share';
  /** 分成比例 0~1 */
  shareRate: number;
  /** 订阅收入 */
  subscriptionRevenue: number;
}

/** 保底+分成模式参数 */
export interface GuaranteeShareParams {
  type: 'guarantee-share';
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
export function validatePricing(params: PricingParams): string[] {
  const errors: string[] = [];
  switch (params.type) {
    case 'buyout':
      if (params.pricePerKWord < 0) errors.push('买断单价不能为负');
      if (params.wordCount < 0) errors.push('字数不能为负');
      break;
    case 'share':
      if (params.shareRate < 0 || params.shareRate > 1) errors.push('分成比例必须在 0~1 之间');
      if (params.subscriptionRevenue < 0) errors.push('订阅收入不能为负');
      break;
    case 'guarantee-share':
      if (params.guarantee < 0) errors.push('保底金额不能为负');
      if (params.shareRate < 0 || params.shareRate > 1) errors.push('分成比例必须在 0~1 之间');
      if (params.subscriptionRevenue < 0) errors.push('订阅收入不能为负');
      break;
  }
  return errors;
}

/**
 * 计算稿费金额
 * - 买断：ceil(字数/1000) × 单价
 * - 分成：订阅收入 × 分成比例
 * - 保底+分成：max(保底, 订阅 × 分成)
 */
export function calculateRoyalty(params: PricingParams): PricingResult {
  const errors = validatePricing(params);
  if (errors.length > 0) {
    return { amount: 0, valid: false, errors };
  }

  let amount: number;
  switch (params.type) {
    case 'buyout':
      amount = Math.ceil(params.wordCount / 1000) * params.pricePerKWord;
      break;
    case 'share':
      amount = params.subscriptionRevenue * params.shareRate;
      break;
    case 'guarantee-share':
      amount = Math.max(params.guarantee, params.subscriptionRevenue * params.shareRate);
      break;
  }

  return { amount: Math.round(amount), valid: true, errors: [] };
}

/** 获取签约模式中文名 */
export function getContractTypeName(type: ContractType): string {
  const names: Record<ContractType, string> = {
    buyout: '买断',
    share: '分成',
    'guarantee-share': '保底+分成',
  };
  return names[type];
}
