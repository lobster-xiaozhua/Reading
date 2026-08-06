/* ============================================================
 * P8-2 · 稿费管理 API：对接后端 /royalties 真实接口
 * - 签约模式：buyout 买断 / share 分成 / guarantee-share 保底+分成
 * - 字数口径：含标点字数（与 word-count.ts 对齐，04 §6.21）
 * - 结算状态：pending 待结算 → settled 已结算 → withdrawn 已提现
 * Source: 04 §13.2 / P8-2-1~5
 * ============================================================ */

import { http, ApiError } from "./http";
import type { ContractType, SettlementStatus } from "@novel/types";

/** 稿费明细行（P8-2-4） */
export interface RoyaltyDetail {
  id: string;
  /** 月份 YYYY-MM */
  month: string;
  /** 小说 ID */
  novelId: string;
  /** 小说标题 */
  novelTitle: string;
  /** 作者 */
  author: string;
  /** 章节数 */
  chapterCount: number;
  /** 含标点字数（稿费口径） */
  wordCount: number;
  /** 签约模式 */
  contractType: ContractType;
  /** 买断单价（书币/千字）；分成模式为分成比例；保底模式为保底金额 */
  rate: number;
  /** 订阅收入（分成模式适用） */
  subscriptionRevenue?: number;
  /** 应发金额（书币） */
  amount: number;
  /** 结算状态 */
  status: SettlementStatus;
  /** 结算时间 */
  settledAt?: number;
  /** 提现时间 */
  withdrawnAt?: number;
}

/** 稿费汇总统计 */
export interface RoyaltyStats {
  /** 本月应发总额 */
  monthlyTotal: number;
  /** 待结算总额 */
  pendingTotal: number;
  /** 已结算未提现总额 */
  settledTotal: number;
  /** 已提现总额 */
  withdrawnTotal: number;
  /** 涉及作者数 */
  authorCount: number;
}

/** 结算流程节点（P8-2-5） */
export interface SettlementFlowNode {
  key: string;
  title: string;
  description: string;
  /** 节点状态：进行中 / 待审 / 通过 / 驳回 */
  status: "waiting" | "processing" | "approved" | "rejected";
}

/** 结算流程定义 */
export const SETTLEMENT_FLOW: SettlementFlowNode[] = [
  {
    key: "generate",
    title: "月初生成账单",
    description: "系统按月汇总各作品字数与订阅收入，自动生成结算账单",
    status: "approved",
  },
  {
    key: "pending",
    title: "待结算",
    description: "账单进入待结算队列，等待财务核对",
    status: "approved",
  },
  {
    key: "verify",
    title: "财务核对",
    description: "财务确认字数口径与分成比例无误",
    status: "processing",
  },
  {
    key: "settled",
    title: "已结算",
    description: "金额计入作者余额，可发起提现",
    status: "waiting",
  },
  {
    key: "withdraw-request",
    title: "作者提现申请",
    description: "作者在 C 端发起提现申请",
    status: "waiting",
  },
  {
    key: "withdrawn",
    title: "已提现",
    description: "提现到账，流程结束",
    status: "waiting",
  },
];

/** 结算状态标签映射 */
export const SETTLEMENT_STATUS_LABEL: Record<
  SettlementStatus,
  { text: string; color: string }
> = {
  pending: { text: "待结算", color: "warning" },
  settled: { text: "已结算", color: "processing" },
  withdrawn: { text: "已提现", color: "success" },
};

/** 签约模式标签 */
export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  buyout: "买断",
  share: "分成",
  "guarantee-share": "保底+分成",
};

/** 生成 mock 稿费明细 */

interface BackendRoyaltyItem {
  id: string;
  month: string;
  novelId: string;
  novelTitle?: string;
  authorId: string;
  authorName: string;
  chapterCount: number;
  wordCount: number;
  contractType: string;
  rate: number | null;
  subscriptionRevenue: number;
  amount: number;
  status: string;
  settledAt: number | null;
  withdrawnAt: number | null;
}

interface BackendRoyaltyStats {
  pendingCount: number;
  pendingAmount: number;
  settledCount: number;
  settledAmount: number;
  withdrawnCount: number;
  withdrawnAmount: number;
  monthlyTotal: number;
}

interface BackendRoyaltyList {
  list: BackendRoyaltyItem[];
  total: number;
  stats: BackendRoyaltyStats;
}

export interface RoyaltyListParams {
  month?: string;
  status?: SettlementStatus | "all";
  author?: string;
  page?: number;
  pageSize?: number;
}

export interface RoyaltyListResponse {
  list: RoyaltyDetail[];
  total: number;
  stats: RoyaltyStats;
}

function mapItem(raw: BackendRoyaltyItem): RoyaltyDetail {
  return {
    id: raw.id,
    month: raw.month,
    novelId: raw.novelId,
    novelTitle: raw.novelTitle || `作品 ${raw.novelId}`,
    author: raw.authorName,
    chapterCount: raw.chapterCount,
    wordCount: raw.wordCount,
    contractType: raw.contractType as ContractType,
    rate: raw.rate ?? 0,
    subscriptionRevenue:
      raw.contractType !== "buyout" ? raw.subscriptionRevenue : undefined,
    amount: raw.amount,
    status: raw.status as SettlementStatus,
    settledAt: raw.settledAt ?? undefined,
    withdrawnAt: raw.withdrawnAt ?? undefined,
  };
}

/** 拉取稿费明细列表 */
export async function fetchRoyaltyList(
  params: RoyaltyListParams = {},
): Promise<RoyaltyListResponse> {
  const { month, status = "all", author, page = 1, pageSize = 20 } = params;
  const data = await http.get<BackendRoyaltyList>("/royalties", {
    month: month ?? "",
    status,
    author_name: author ?? "",
    page,
    page_size: pageSize,
  });
  const list = (data.list ?? []).map(mapItem);
  const s = data.stats;
  return {
    list,
    total: data.total ?? list.length,
    stats: {
      monthlyTotal: s?.monthlyTotal ?? 0,
      pendingTotal: s?.pendingAmount ?? 0,
      settledTotal: s?.settledAmount ?? 0,
      withdrawnTotal: s?.withdrawnAmount ?? 0,
      authorCount: new Set(list.map((r) => r.author)).size,
    },
  };
}

/** 批量结算 */
export async function batchSettle(
  ids: string[],
): Promise<{ success: boolean }> {
  try {
    await http.post("/royalties/batch-settle", { ids: ids.map(Number) });
    return { success: true };
  } catch (err) {
    if (err instanceof ApiError) return { success: false };
    return { success: false };
  }
}

/** 标记已提现 */
export async function markWithdrawn(
  ids: string[],
): Promise<{ success: boolean }> {
  try {
    await http.post("/royalties/mark-withdrawn", { ids: ids.map(Number) });
    return { success: true };
  } catch {
    return { success: false };
  }
}
