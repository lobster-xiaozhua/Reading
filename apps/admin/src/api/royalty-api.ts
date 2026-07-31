/* ============================================================
 * P8-2 · 稿费管理 Mock API
 * - 签约模式：buyout 买断 / share 分成 / guarantee-share 保底+分成
 * - 字数口径：含标点字数（与 word-count.ts 对齐，04 §6.21）
 * - 结算状态：pending 待结算 → settled 已结算 → withdrawn 已提现
 * Source: 04 §13.2 / P8-2-1~5
 * ============================================================ */

import type { ContractType, SettlementStatus } from '@novel/types';

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
  status: 'waiting' | 'processing' | 'approved' | 'rejected';
}

/** 结算流程定义 */
export const SETTLEMENT_FLOW: SettlementFlowNode[] = [
  {
    key: 'generate',
    title: '月初生成账单',
    description: '系统按月汇总各作品字数与订阅收入，自动生成结算账单',
    status: 'approved',
  },
  {
    key: 'pending',
    title: '待结算',
    description: '账单进入待结算队列，等待财务核对',
    status: 'approved',
  },
  {
    key: 'verify',
    title: '财务核对',
    description: '财务确认字数口径与分成比例无误',
    status: 'processing',
  },
  {
    key: 'settled',
    title: '已结算',
    description: '金额计入作者余额，可发起提现',
    status: 'waiting',
  },
  {
    key: 'withdraw-request',
    title: '作者提现申请',
    description: '作者在 C 端发起提现申请',
    status: 'waiting',
  },
  {
    key: 'withdrawn',
    title: '已提现',
    description: '提现到账，流程结束',
    status: 'waiting',
  },
];

/** 结算状态标签映射 */
export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, { text: string; color: string }> = {
  pending: { text: '待结算', color: 'warning' },
  settled: { text: '已结算', color: 'processing' },
  withdrawn: { text: '已提现', color: 'success' },
};

/** 签约模式标签 */
export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  buyout: '买断',
  share: '分成',
  'guarantee-share': '保底+分成',
};

/** 生成 mock 稿费明细 */
function generateMockDetails(): RoyaltyDetail[] {
  const novels = [
    { id: 'n1', title: '斗破苍穹', author: '天蚕土豆', contractType: 'buyout' as ContractType, rate: 50 },
    { id: 'n2', title: '凡人修仙传', author: '忘语', contractType: 'share' as ContractType, rate: 0.6 },
    { id: 'n3', title: '遮天', author: '辰东', contractType: 'guarantee-share' as ContractType, rate: 0.5 },
    { id: 'n4', title: '诡秘之主', author: '爱潜水的乌贼', contractType: 'share' as ContractType, rate: 0.7 },
    { id: 'n5', title: '大奉打更人', author: '卖报小郎君', contractType: 'buyout' as ContractType, rate: 45 },
  ];
  const statuses: SettlementStatus[] = ['pending', 'settled', 'withdrawn'];
  const now = Date.now();
  const list: RoyaltyDetail[] = [];
  let idx = 0;
  // 最近 3 个月
  for (let m = 0; m < 3; m++) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - m);
    const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    novels.forEach((n) => {
      const chapterCount = 20 + ((idx * 7) % 15);
      const wordCount = chapterCount * (2000 + ((idx * 13) % 800));
      let amount: number;
      const subscriptionRevenue = 8000 + ((idx * 311) % 6000);
      if (n.contractType === 'buyout') {
        amount = Math.ceil(wordCount / 1000) * n.rate;
      } else if (n.contractType === 'share') {
        amount = Math.round(subscriptionRevenue * n.rate);
      } else {
        // guarantee-share: max(保底, 订阅×分成)
        const guarantee = 5000;
        amount = Math.max(guarantee, Math.round(subscriptionRevenue * n.rate));
      }
      // 当前月多 pending，往月多 settled/withdrawn
      const status: SettlementStatus = m === 0 ? statuses[idx % 2] : statuses[(idx % 2) + 1];
      list.push({
        id: `roy-${month}-${n.id}`,
        month,
        novelId: n.id,
        novelTitle: n.title,
        author: n.author,
        chapterCount,
        wordCount,
        contractType: n.contractType,
        rate: n.rate,
        subscriptionRevenue: n.contractType !== 'buyout' ? subscriptionRevenue : undefined,
        amount,
        status,
        settledAt: status !== 'pending' ? now - idx * 86400000 : undefined,
        withdrawnAt: status === 'withdrawn' ? now - idx * 43200000 : undefined,
      });
      idx++;
    });
  }
  return list;
}

let MOCK_DETAILS: RoyaltyDetail[] = generateMockDetails();

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export interface RoyaltyListParams {
  month?: string;
  status?: SettlementStatus | 'all';
  author?: string;
  page?: number;
  pageSize?: number;
}

export interface RoyaltyListResponse {
  list: RoyaltyDetail[];
  total: number;
  stats: RoyaltyStats;
}

/** 拉取稿费明细列表 */
export async function fetchRoyaltyList(params: RoyaltyListParams = {}): Promise<RoyaltyListResponse> {
  await delay(300);
  const { month, status = 'all', author, page = 1, pageSize = 20 } = params;
  let filtered = MOCK_DETAILS;
  if (month) filtered = filtered.filter((r) => r.month === month);
  if (status !== 'all') filtered = filtered.filter((r) => r.status === status);
  if (author) filtered = filtered.filter((r) => r.author.includes(author) || r.novelTitle.includes(author));

  const monthlyTotal = filtered.reduce((s, r) => s + r.amount, 0);
  const pendingTotal = filtered.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
  const settledTotal = filtered.filter((r) => r.status === 'settled').reduce((s, r) => s + r.amount, 0);
  const withdrawnTotal = filtered.filter((r) => r.status === 'withdrawn').reduce((s, r) => s + r.amount, 0);
  const authorSet = new Set(filtered.map((r) => r.author));

  const start = (page - 1) * pageSize;
  const list = filtered.slice(start, start + pageSize);

  return {
    list,
    total: filtered.length,
    stats: {
      monthlyTotal,
      pendingTotal,
      settledTotal,
      withdrawnTotal,
      authorCount: authorSet.size,
    },
  };
}

/** 批量结算 */
export async function batchSettle(ids: string[]): Promise<{ success: boolean }> {
  await delay(400);
  const idSet = new Set(ids);
  MOCK_DETAILS = MOCK_DETAILS.map((r) =>
    idSet.has(r.id) && r.status === 'pending'
      ? { ...r, status: 'settled' as SettlementStatus, settledAt: Date.now() }
      : r,
  );
  return { success: true };
}

/** 标记已提现 */
export async function markWithdrawn(ids: string[]): Promise<{ success: boolean }> {
  await delay(400);
  const idSet = new Set(ids);
  MOCK_DETAILS = MOCK_DETAILS.map((r) =>
    idSet.has(r.id) && r.status === 'settled'
      ? { ...r, status: 'withdrawn' as SettlementStatus, withdrawnAt: Date.now() }
      : r,
  );
  return { success: true };
}
