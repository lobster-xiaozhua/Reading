/* ============================================================
 * P2-22 · AuthorManager 作者档案与合同管理
 * 作者信息卡 + 作品列表 Table + 合同 Descriptions + 收益 StatisticCard ×3
 * 合同到期前 30 天高亮 --feedback-warning；解约作者作品置灰仍可查
 * Source: 04 §6.22
 * ============================================================ */

import { forwardRef, useMemo } from 'react';
import { Card, Descriptions, Tag, Avatar, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import type { ContractType, SettlementStatus } from '@novel/types';
import { BStatisticCard } from '../statistic-card/BStatisticCard.js';

/** 作者信息 */
export interface AuthorInfo {
  id: string;
  name: string;
  avatar: string;
  penName: string;
  /** 签约状态 */
  contractStatus: 'active' | 'terminated' | 'pending';
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
  status: 'published' | 'offline' | 'draft';
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
  status: 'active' | 'expired' | 'terminated';
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

const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  buyout: '买断',
  share: '分成',
  'guarantee-share': '保底+分成',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * B 端作者档案与合同管理
 * - 作者信息卡（头像 + 笔名 + 签约状态）
 * - 合同 Descriptions（到期前 30 天高亮 warning）
 * - 收益 StatisticCard ×3（本月/累计/待结算）
 * - 作品列表 Table（解约作者作品置灰仍可查）
 */
export const BAuthorManager = forwardRef<HTMLDivElement, BAuthorManagerProps>(
  function BAuthorManager({ author, works, contract, royalty }, ref) {
    // 合同到期前 30 天高亮
    const daysToExpire = useMemo(() => {
      return Math.floor((contract.expireTimestamp - Date.now()) / DAY_MS);
    }, [contract.expireTimestamp]);

    const isExpiringSoon = daysToExpire > 0 && daysToExpire <= 30;
    const isTerminated = author.contractStatus === 'terminated';

    const workColumns: TableColumnsType<AuthorWork> = [
      {
        title: '作品名称',
        dataIndex: 'title',
        key: 'title',
        render: (title: string) => (
          <span style={{ color: isTerminated ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}>
            {title}
          </span>
        ),
      },
      { title: '分类', dataIndex: 'category', key: 'category', width: 120 },
      {
        title: '字数',
        dataIndex: 'wordCount',
        key: 'wordCount',
        width: 120,
        align: 'right',
        render: (v: number) => v.toLocaleString(),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: AuthorWork['status']) => {
          const config: Record<AuthorWork['status'], { color: string; text: string }> = {
            published: { color: 'success', text: '已发布' },
            offline: { color: 'error', text: '已下架' },
            draft: { color: 'default', text: '草稿' },
          };
          const c = config[status];
          return <Tag color={c.color}>{c.text}</Tag>;
        },
      },
      {
        title: '更新时间',
        dataIndex: 'lastUpdated',
        key: 'lastUpdated',
        width: 180,
        render: (v: number) => new Date(v).toLocaleString('zh-CN'),
      },
    ];

    return (
      <div ref={ref} className="b-author-manager" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* 作者信息卡 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <Avatar size={64} src={author.avatar} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--font-size-h3, 20px)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {author.name}
                </span>
                {author.penName !== author.name && (
                  <span style={{ color: 'var(--color-text-secondary)' }}>（笔名：{author.penName}）</span>
                )}
              </div>
              <div style={{ marginTop: 'var(--space-1)', display: 'flex', gap: 'var(--space-3)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-body, 14px)' }}>
                <span>签约模式：{CONTRACT_TYPE_LABEL[author.contractType]}</span>
                <span>作品数：{author.workCount}</span>
                <span>累计字数：{author.totalWords.toLocaleString()}</span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {author.contractStatus === 'active' && <Tag color="success">签约中</Tag>}
              {author.contractStatus === 'terminated' && <Tag color="default">已解约</Tag>}
              {author.contractStatus === 'pending' && <Tag color="warning">待签约</Tag>}
            </div>
          </div>
        </Card>

        {/* 合同 + 收益 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--space-4)' }}>
          <div style={{ gridColumn: 'span 6' }}>
            <Card title="合同信息">
              <Descriptions
                bordered
                column={1}
                size="small"
                items={[
                  { key: 'type', label: '签约模式', children: CONTRACT_TYPE_LABEL[contract.type] },
                  { key: 'signed', label: '签约日期', children: contract.signedAt },
                  {
                    key: 'expire',
                    label: '到期日期',
                    children: (
                      <Tooltip title={isExpiringSoon ? `即将到期（剩 ${daysToExpire} 天）` : undefined}>
                        <span style={{ color: isExpiringSoon ? 'var(--color-feedback-warning)' : undefined, fontWeight: isExpiringSoon ? 600 : undefined }}>
                          {contract.expireAt}
                          {isExpiringSoon && ` （剩 ${daysToExpire} 天）`}
                        </span>
                      </Tooltip>
                    ),
                  },
                  { key: 'terms', label: '签约条款', children: contract.terms },
                  {
                    key: 'status',
                    label: '合同状态',
                    children:
                      contract.status === 'active' ? (
                        <Tag color="success">生效中</Tag>
                      ) : contract.status === 'expired' ? (
                        <Tag color="error">已过期</Tag>
                      ) : (
                        <Tag color="default">已终止</Tag>
                      ),
                  },
                ]}
              />
            </Card>
          </div>
          <div style={{ gridColumn: 'span 6' }}>
            <Card title="收益统计">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                <BStatisticCard title="本月收益" value={royalty.monthly} prefix="¥" trend="up" trendText="+8.2%" trendLabel="较上月" />
                <BStatisticCard title="累计收益" value={royalty.total} prefix="¥" />
                <BStatisticCard
                  title="待结算"
                  value={royalty.pending}
                  prefix="¥"
                  trend={royalty.settlementStatus === 'pending' ? 'flat' : 'up'}
                  trendText={royalty.settlementStatus === 'pending' ? '待结算' : '已结算'}
                />
              </div>
            </Card>
          </div>
        </div>

        {/* 作品列表 */}
        <Card title={`作品列表（${works.length}）`}>
          <Table
            columns={workColumns}
            dataSource={works}
            rowKey="id"
            size="middle"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
            rowClassName={isTerminated ? 'b-author-work--dimmed' : undefined}
          />
          {isTerminated && (
            <style>{`
              .b-author-work--dimmed { opacity: 0.6; }
            `}</style>
          )}
        </Card>
      </div>
    );
  },
);
