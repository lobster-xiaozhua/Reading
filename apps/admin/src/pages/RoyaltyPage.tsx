/* ============================================================
 * P8-2 · 稿费管理页
 * - 顶部：结算流程图（SettlementFlow）
 * - 中部：4 个汇总统计卡片（本月应发 / 待结算 / 已结算 / 已提现）
 * - 底部：稿费明细表（BRoyaltyDetail）+ 月份/状态筛选 + 批量结算/提现
 * Source: 04 §13.2 / P8-2-4~5
 * ============================================================ */

import { useCallback, useEffect, useState } from 'react';
import { Card, Row, Col, Select, Button, Space, App } from 'antd';
import { BPageHeader, BRoyaltyDetail, SettlementFlow } from '@novel/b-end';
import type { BPageHeaderProps } from '@novel/b-end';
import type { RoyaltyDetailRow } from '@novel/b-end';
import {
  fetchRoyaltyList,
  batchSettle,
  markWithdrawn,
  SETTLEMENT_STATUS_LABEL,
} from '@/api/royalty-api';
import type { RoyaltyDetail, RoyaltyStats } from '@/api/royalty-api';
import type { SettlementStatus } from '@novel/types';

function formatAmount(n: number): string {
  return n.toLocaleString('zh-CN');
}

export default function RoyaltyPage() {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<RoyaltyDetail[]>([]);
  const [stats, setStats] = useState<RoyaltyStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<SettlementStatus | 'all'>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 月份选项（最近 6 个月）
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { label: v, value: v };
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRoyaltyList({
        month: filterMonth || undefined,
        status: filterStatus,
        page,
        pageSize,
      });
      setList(res.list);
      setStats(res.stats);
      setTotal(res.total);
    } catch {
      message.error('稿费明细加载失败');
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterStatus, page, pageSize, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const breadcrumb: BPageHeaderProps['breadcrumb'] = [
    { title: '运营管理' },
    { title: '稿费管理' },
  ];

  const statCards: { title: string; value: number; suffix: string; color: string }[] = stats
    ? [
        { title: '本月应发总额', value: stats.monthlyTotal, suffix: '书币', color: 'var(--color-text-primary)' },
        { title: '待结算', value: stats.pendingTotal, suffix: '书币', color: 'var(--color-feedback-warning)' },
        { title: '已结算未提现', value: stats.settledTotal, suffix: '书币', color: 'var(--color-brand)' },
        { title: '已提现', value: stats.withdrawnTotal, suffix: '书币', color: 'var(--color-feedback-success)' },
      ]
    : [];

  const rows: RoyaltyDetailRow[] = list.map((r) => ({ ...r }));

  const handleBatchSettle = () => {
    const pendingIds = list.filter((r) => selectedRowKeys.includes(r.id) && r.status === 'pending').map((r) => r.id);
    if (pendingIds.length === 0) {
      message.warning('选中行中没有可结算的记录（仅「待结算」状态可结算）');
      return;
    }
    modal.confirm({
      title: '确认批量结算',
      content: `将对 ${pendingIds.length} 条「待结算」记录执行结算，金额计入作者余额。`,
      okText: '确认结算',
      cancelText: '取消',
      onOk: async () => {
        await batchSettle(pendingIds);
        message.success(`已结算 ${pendingIds.length} 条`);
        setSelectedRowKeys([]);
        loadData();
      },
    });
  };

  const handleBatchWithdraw = () => {
    const settledIds = list.filter((r) => selectedRowKeys.includes(r.id) && r.status === 'settled').map((r) => r.id);
    if (settledIds.length === 0) {
      message.warning('选中行中没有可提现的记录（仅「已结算」状态可提现）');
      return;
    }
    modal.confirm({
      title: '确认批量标记提现',
      content: `将对 ${settledIds.length} 条「已结算」记录标记为已提现。`,
      okText: '确认提现',
      cancelText: '取消',
      onOk: async () => {
        await markWithdrawn(settledIds);
        message.success(`已标记提现 ${settledIds.length} 条`);
        setSelectedRowKeys([]);
        loadData();
      },
    });
  };

  return (
    <div>
      <BPageHeader title="稿费管理" breadcrumb={breadcrumb} />

      {/* 结算流程图 */}
      <Card title="结算流程" size="small" style={{ marginBottom: 'var(--space-4)' }}>
        <SettlementFlow />
      </Card>

      {/* 汇总统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--space-4)' }}>
        {statCards.map((c) => (
          <Col span={6} key={c.title}>
            <Card size="small">
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 'var(--space-1)' }}>
                {c.title}
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, fontFamily: 'var(--font-mono)', color: c.color }}>
                {formatAmount(c.value)}
                <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 'var(--space-1)', color: 'var(--color-text-tertiary)' }}>
                  {c.suffix}
                </span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 明细表 */}
      <Card
        title="稿费明细"
        size="small"
        extra={
          <Space>
            <Select
              placeholder="月份"
              allowClear
              style={{ width: 140 }}
              value={filterMonth || undefined}
              onChange={(v) => { setFilterMonth(v ?? ''); setPage(1); }}
              options={monthOptions}
            />
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 120 }}
              value={filterStatus === 'all' ? undefined : filterStatus}
              onChange={(v) => { setFilterStatus((v as SettlementStatus) ?? 'all'); setPage(1); }}
              options={Object.entries(SETTLEMENT_STATUS_LABEL).map(([k, v]) => ({ label: v.text, value: k }))}
            />
            <Button onClick={() => { setFilterMonth(''); setFilterStatus('all'); setPage(1); }}>
              重置
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 'var(--space-3)' }}>
          <Button type="primary" onClick={handleBatchSettle} disabled={selectedRowKeys.length === 0}>
            批量结算
          </Button>
          <Button onClick={handleBatchWithdraw} disabled={selectedRowKeys.length === 0}>
            批量标记提现
          </Button>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
            共 {total} 条 · 涉及 {stats?.authorCount ?? 0} 位作者
          </span>
        </Space>
        <BRoyaltyDetail
          dataSource={rows}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (t: number) => `共 ${t} 条`,
            onChange: (p: number, s: number) => { setPage(p); setPageSize(s); },
          }}
        />
      </Card>
    </div>
  );
}
