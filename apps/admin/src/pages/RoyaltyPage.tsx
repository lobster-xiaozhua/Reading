import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      message.error(t('royalty:message.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterStatus, page, pageSize, message, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const breadcrumb: BPageHeaderProps['breadcrumb'] = [
    { title: t('royalty:breadcrumb.operation') },
    { title: t('royalty:breadcrumb.royalty') },
  ];

  const statCards: { title: string; value: number; suffix: string; color: string }[] = stats
    ? [
        { title: t('royalty:stats.monthlyTotal'), value: stats.monthlyTotal, suffix: t('royalty:stats.unit'), color: 'var(--color-text-primary)' },
        { title: t('royalty:stats.pendingSettlement'), value: stats.pendingTotal, suffix: t('royalty:stats.unit'), color: 'var(--color-feedback-warning)' },
        { title: t('royalty:stats.settled'), value: stats.settledTotal, suffix: t('royalty:stats.unit'), color: 'var(--color-brand)' },
        { title: t('royalty:stats.withdrawn'), value: stats.withdrawnTotal, suffix: t('royalty:stats.unit'), color: 'var(--color-feedback-success)' },
      ]
    : [];

  const rows: RoyaltyDetailRow[] = list.map((r) => ({ ...r }));

  const handleBatchSettle = () => {
    const pendingIds = list.filter((r) => selectedRowKeys.includes(r.id) && r.status === 'pending').map((r) => r.id);
    if (pendingIds.length === 0) {
      message.warning(t('royalty:message.noSettleable'));
      return;
    }
    modal.confirm({
      title: t('royalty:confirmSettle.title'),
      content: t('royalty:confirmSettle.content', { count: pendingIds.length }),
      okText: t('royalty:confirmSettle.confirm'),
      cancelText: t('royalty:confirmSettle.cancel'),
      onOk: async () => {
        await batchSettle(pendingIds);
        message.success(t('royalty:message.settled', { count: pendingIds.length }));
        setSelectedRowKeys([]);
        loadData();
      },
    });
  };

  const handleBatchWithdraw = () => {
    const settledIds = list.filter((r) => selectedRowKeys.includes(r.id) && r.status === 'settled').map((r) => r.id);
    if (settledIds.length === 0) {
      message.warning(t('royalty:message.noWithdrawable'));
      return;
    }
    modal.confirm({
      title: t('royalty:confirmWithdraw.title'),
      content: t('royalty:confirmWithdraw.content', { count: settledIds.length }),
      okText: t('royalty:confirmWithdraw.confirm'),
      cancelText: t('royalty:confirmWithdraw.cancel'),
      onOk: async () => {
        await markWithdrawn(settledIds);
        message.success(t('royalty:message.withdrawn', { count: settledIds.length }));
        setSelectedRowKeys([]);
        loadData();
      },
    });
  };

  return (
    <div>
      <BPageHeader title={t('royalty:title')} breadcrumb={breadcrumb} />

      <Card title={t('royalty:settlementFlow')} size="small" style={{ marginBottom: 'var(--space-4)' }}>
        <SettlementFlow />
      </Card>

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

      <Card
        title={t('royalty:detail')}
        size="small"
        extra={
          <Space>
            <Select
              placeholder={t('royalty:month')}
              allowClear
              style={{ width: 140 }}
              value={filterMonth || undefined}
              onChange={(v) => { setFilterMonth(v ?? ''); setPage(1); }}
              options={monthOptions}
            />
            <Select
              placeholder={t('royalty:status')}
              allowClear
              style={{ width: 120 }}
              value={filterStatus === 'all' ? undefined : filterStatus}
              onChange={(v) => { setFilterStatus((v as SettlementStatus) ?? 'all'); setPage(1); }}
              options={Object.entries(SETTLEMENT_STATUS_LABEL).map(([k, v]) => ({ label: v.text, value: k }))}
            />
            <Button onClick={() => { setFilterMonth(''); setFilterStatus('all'); setPage(1); }}>
              {t('common:reset')}
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 'var(--space-3)' }}>
          <Button type="primary" onClick={handleBatchSettle} disabled={selectedRowKeys.length === 0}>
            {t('royalty:batchSettle')}
          </Button>
          <Button onClick={handleBatchWithdraw} disabled={selectedRowKeys.length === 0}>
            {t('royalty:batchWithdraw')}
          </Button>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
            {t('royalty:pagination', { total, count: stats?.authorCount ?? 0 })}
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