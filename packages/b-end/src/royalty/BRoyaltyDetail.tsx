/* ============================================================
 * P8-2-4 · 稿费明细表 BRoyaltyDetail
 * 列：月份 / 小说 / 章节数 / 字数 / 单价或分成 / 金额 / 状态
 * 金额右对齐千分位；状态色：pending warning / settled processing / withdrawn success
 * Source: 04 §13.2 / P8-2-4
 * ============================================================ */

import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BTable } from '../table/BTable.js';
import type { BTableProps } from '../table/BTable.js';
import { getContractTypeName } from '../data-model/vip-pricing.js';

/** 稿费明细行（与 royalty-api RoyaltyDetail 对齐，组件层独立定义避免循环依赖） */
export interface RoyaltyDetailRow {
  id: string;
  month: string;
  novelTitle: string;
  author: string;
  chapterCount: number;
  wordCount: number;
  contractType: 'buyout' | 'share' | 'guarantee-share';
  rate: number;
  subscriptionRevenue?: number;
  amount: number;
  status: 'pending' | 'settled' | 'withdrawn';
  settledAt?: number;
  withdrawnAt?: number;
}

/** 金额千分位格式化 */
function formatAmount(n: number): string {
  return n.toLocaleString('zh-CN');
}

/** 状态标签配置（P8-2-3） */
const STATUS_TAG: Record<RoyaltyDetailRow['status'], { text: string; color: string }> = {
  pending: { text: '待结算', color: 'warning' },
  settled: { text: '已结算', color: 'processing' },
  withdrawn: { text: '已提现', color: 'success' },
};

/** 默认列定义（金额右对齐，P8-2-4） */
export function defaultRoyaltyColumns(): ColumnsType<RoyaltyDetailRow> {
  return [
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      width: 110,
      fixed: 'left',
    },
    {
      title: '小说',
      dataIndex: 'novelTitle',
      key: 'novelTitle',
      width: 160,
      render: (text: string, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{row.author}</div>
        </div>
      ),
    },
    {
      title: '章节数',
      dataIndex: 'chapterCount',
      key: 'chapterCount',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.chapterCount - b.chapterCount,
    },
    {
      title: '字数（含标点）',
      dataIndex: 'wordCount',
      key: 'wordCount',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.wordCount - b.wordCount,
      render: (v: number) => formatAmount(v),
    },
    {
      title: '签约模式',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 110,
      render: (t: RoyaltyDetailRow['contractType'], row) => {
        const label = getContractTypeName(t);
        const rateText =
          t === 'buyout'
            ? `${row.rate} 书币/千字`
            : t === 'share'
              ? `分成 ${(row.rate * 100).toFixed(0)}%`
              : `保底 ${formatAmount(row.rate)} + 分成`;
        return (
          <div>
            <div>{label}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{rateText}</div>
          </div>
        );
      },
    },
    {
      title: '应发金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (v: number) => (
        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
          {formatAmount(v)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      fixed: 'right',
      render: (s: RoyaltyDetailRow['status']) => {
        const cfg = STATUS_TAG[s];
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
  ];
}

export interface BRoyaltyDetailProps {
  /** 自定义列；不传则使用默认列 */
  columns?: BTableProps<RoyaltyDetailRow>['columns'];
  /** 数据源 */
  dataSource?: RoyaltyDetailRow[];
  /** 行 key */
  rowKey?: BTableProps<RoyaltyDetailRow>['rowKey'];
  /** 加载态 */
  loading?: boolean;
  /** 分页 */
  pagination?: BTableProps<RoyaltyDetailRow>['pagination'];
  /** 行选择 */
  rowSelection?: BTableProps<RoyaltyDetailRow>['rowSelection'];
}

/**
 * 稿费明细表组件。
 * 默认列对齐 P8-2-4 规范，金额右对齐千分位，状态色映射 P8-2-3。
 */
export function BRoyaltyDetail(props: BRoyaltyDetailProps) {
  const { columns, dataSource, rowKey, loading, pagination, rowSelection } = props;
  return (
    <BTable
      columns={(columns as any) ?? (defaultRoyaltyColumns() as any)}
      dataSource={dataSource as any}
      rowKey={rowKey as any}
      loading={loading}
      pagination={pagination as any}
      rowSelection={rowSelection as any}
    />
  );
}
