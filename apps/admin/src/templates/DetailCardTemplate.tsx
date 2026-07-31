/* ============================================================
 * P3-3 · 卡片页模板 DetailCardTemplate
 * PageHeader + 基本信息 Card（span=8）+ 数据统计 Card（span=4）+ 章节 Card + 审核 Timeline + 评论 Card
 * 状态变体：加载中 / 未找到 404 / 已下架 Alert
 * Source: 04 §5.3
 * ============================================================ */

import { Card, Skeleton, Result, Alert, Button, Empty, Timeline, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BPageHeader, BDescriptions, BTimeline } from '@novel/b-end';
import type { BPageHeaderProps } from '@novel/b-end';

export type DetailCardStatus = 'loading' | 'ready' | 'not-found' | 'offline';

/** 基本信息 Descriptions 条目 */
export interface DescItem {
  key: string;
  label: string;
  /** 跨列数 */
  span?: number;
  children: React.ReactNode;
}

/** 审核历史条目 */
export interface AuditHistoryItem {
  time: string;
  operator: string;
  result: 'approve' | 'revise' | 'reject';
  comment?: string;
}

/** 评论条目 */
export interface CommentItem {
  id: string;
  user: string;
  avatar?: string;
  content: string;
  time: string;
  likes?: number;
}

export interface DetailCardTemplateProps {
  /** 页面标题 */
  title: string;
  /** 面包屑 */
  breadcrumb?: BPageHeaderProps['breadcrumb'];
  /** 状态 */
  status: DetailCardStatus;
  /** 已下架提示文案（offline 状态显示） */
  offlineMessage?: string;
  /** 返回回调 */
  onBack?: BPageHeaderProps['onBack'];
  /** PageHeader 操作区 */
  extra?: React.ReactNode;

  /* ---------- 基本信息 Card（span=8） ---------- */
  basicTitle?: string;
  basicItems?: DescItem[];

  /* ---------- 数据统计 Card（span=4） ---------- */
  statsTitle?: string;
  /** 统计数据节点（自由渲染，如 Progress circle） */
  statsContent?: React.ReactNode;

  /* ---------- 章节 Card ---------- */
  chapterTitle?: string;
  /** 章节列表节点 */
  chapterContent?: React.ReactNode;

  /* ---------- 审核 Timeline ---------- */
  auditTitle?: string;
  auditHistory?: AuditHistoryItem[];

  /* ---------- 评论 Card ---------- */
  commentTitle?: string;
  comments?: CommentItem[];
}

function getAuditColor(result: AuditHistoryItem['result']): string {
  switch (result) {
    case 'approve':
      return 'green';
    case 'reject':
      return 'red';
    case 'revise':
      return 'blue';
  }
}

function getAuditLabel(result: AuditHistoryItem['result']): string {
  switch (result) {
    case 'approve':
      return '通过';
    case 'reject':
      return '驳回';
    case 'revise':
      return '待修改';
  }
}

/**
 * B 端卡片详情页模板
 * - 12 列栅格：基本信息 span=8 + 数据统计 span=4
 * - 章节卡 + 审核 Timeline + 评论卡纵向排列
 */
export function DetailCardTemplate(props: DetailCardTemplateProps) {
  const {
    title,
    breadcrumb,
    status,
    offlineMessage = '该内容已下架，以下数据仅供查看。',
    onBack,
    extra,
    basicTitle = '基本信息',
    basicItems = [],
    statsTitle = '数据统计',
    statsContent,
    chapterTitle = '章节列表',
    chapterContent,
    auditTitle = '审核历史',
    auditHistory = [],
    commentTitle = '评论 Top10',
    comments = [],
  } = props;

  // 404
  if (status === 'not-found') {
    return (
      <div>
        <BPageHeader title={title} breadcrumb={breadcrumb} onBack={onBack} />
        <Result
          status="404"
          title="未找到内容"
          subTitle="该内容不存在或已被永久删除。"
          extra={
            <Button type="primary" icon={<ArrowLeftOutlined />} onClick={onBack}>
              返回列表
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="b-detail-card">
      <BPageHeader title={title} breadcrumb={breadcrumb} onBack={onBack} extra={extra} />

      {/* 已下架 Alert */}
      {status === 'offline' && (
        <Alert
          type="warning"
          showIcon
          message="内容已下架"
          description={offlineMessage}
          style={{ marginBottom: 'var(--space-4)' }}
        />
      )}

      {status === 'loading' ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <>
          {/* 基本信息 + 数据统计：12 列栅格，8+4 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div style={{ gridColumn: 'span 8' }}>
              <Card title={basicTitle}>
                {basicItems.length > 0 ? (
                  <BDescriptions
                    bordered
                    column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
                    items={basicItems.map((item) => ({
                      key: item.key,
                      label: item.label,
                      span: item.span,
                      children: item.children,
                    }))}
                  />
                ) : (
                  <Empty description="暂无基本信息" />
                )}
              </Card>
            </div>
            <div style={{ gridColumn: 'span 4' }}>
              <Card title={statsTitle}>
                {statsContent ?? <Empty description="暂无统计数据" />}
              </Card>
            </div>
          </div>

          {/* 章节列表 */}
          <Card title={chapterTitle} style={{ marginBottom: 'var(--space-4)' }}>
            {chapterContent ?? <Empty description="暂无章节" />}
          </Card>

          {/* 审核历史 Timeline */}
          <Card title={auditTitle} style={{ marginBottom: 'var(--space-4)' }}>
            {auditHistory.length === 0 ? (
              <Empty description="暂无审核记录" />
            ) : (
              <BTimeline
                items={auditHistory.map((h) => ({
                  color: getAuditColor(h.result),
                  children: (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Tag color={h.result === 'approve' ? 'success' : h.result === 'reject' ? 'error' : 'processing'}>
                          {getAuditLabel(h.result)}
                        </Tag>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)' }}>
                          {h.operator} · {h.time}
                        </span>
                      </div>
                      {h.comment && <p style={{ marginTop: 'var(--space-1)' }}>{h.comment}</p>}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>

          {/* 评论 Top10 */}
          <Card title={commentTitle}>
            {comments.length === 0 ? (
              <Empty description="暂无评论" />
            ) : (
              <Timeline
                items={comments.map((c) => ({
                  children: (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <strong style={{ color: 'var(--color-text-primary)' }}>{c.user}</strong>
                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-caption, 13px)' }}>{c.time}</span>
                        {c.likes !== undefined && c.likes > 0 && (
                          <Tag>{c.likes} 赞</Tag>
                        )}
                      </div>
                      <p style={{ marginTop: 'var(--space-1)', color: 'var(--color-text-secondary)' }}>{c.content}</p>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
