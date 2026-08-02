import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardTemplate } from '@/templates/DashboardTemplate';
import type { DashboardStatus, KpiItem, OverviewSection, QuickAction } from '@/templates/DashboardTemplate';
import { BLineChart } from '@novel/b-end';
import { fetcher } from '@/api/fetcher';
import { fetchWorkbenchTrend, type TrendRange, type WorkbenchTrendItem } from '@/api/chart-api';

export default function WorkbenchPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [overviews] = useState<OverviewSection[]>([]);
  const [todoCount, setTodoCount] = useState(0);
  const [trendRange, setTrendRange] = useState<TrendRange>(30);
  const [trendData, setTrendData] = useState<WorkbenchTrendItem[]>([]);
  const [trendMetric, setTrendMetric] = useState<'newNovels' | 'newReaders' | 'monthlyTickets'>('newReaders');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const kpi = await fetcher.workbench.getKpiCards();
        if (cancelled) return;
        setKpis([
          { key: 'totalNovels', title: '作品总数', value: kpi.totalNovels, suffix: '部', trend: 'up', trendText: `${kpi.publishedNovels} 已发布`, trendLabel: '' },
          { key: 'pendingAudit', title: '待审核', value: kpi.pendingAudit, suffix: '条', trend: kpi.pendingAudit > 0 ? 'down' : 'up', trendText: '', trendLabel: '需处理' },
          { key: 'totalAuthors', title: '作者总数', value: kpi.totalAuthors, suffix: '人', trend: 'up', trendText: '', trendLabel: '' },
          { key: 'totalReaders', title: '读者总数', value: kpi.totalReaders, suffix: '人', trend: 'up', trendText: '', trendLabel: '' },
        ]);
        setTodoCount(kpi.pendingAudit);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const loadTrend = useCallback(async (range: TrendRange) => {
    const data = await fetchWorkbenchTrend(range);
    setTrendData(data);
  }, []);

  useEffect(() => {
    loadTrend(trendRange);
  }, [trendRange, loadTrend]);

  const quickActions: QuickAction[] = [
    { key: 'newNovel', label: '新建作品', onClick: () => navigate('/novel/create') },
    { key: 'novelList', label: '作品管理', onClick: () => navigate('/novel') },
    { key: 'audit', label: '内容审核', onClick: () => navigate('/audit') },
    { key: 'charts', label: '数据看板', onClick: () => navigate('/charts') },
  ];

  const metricLabel: Record<typeof trendMetric, string> = {
    newNovels: '新增作品',
    newReaders: '新增读者',
    monthlyTickets: '月票',
  };

  const chart = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-body, 14px)' }}>
          {metricLabel[trendMetric]}趋势
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {(['newNovels', 'newReaders', 'monthlyTickets'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTrendMetric(m)}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                border: `1px solid ${trendMetric === m ? 'var(--color-brand)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-sm, 4px)',
                background: trendMetric === m ? 'var(--color-brand-bg)' : 'transparent',
                color: trendMetric === m ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              {metricLabel[m]}
            </button>
          ))}
        </div>
      </div>
      <BLineChart
        data={trendData as unknown as Record<string, unknown>[]}
        xField="date"
        yField={trendMetric}
        height={300}
        smooth
        showLegend={false}
      />
    </div>
  );

  return (
    <DashboardTemplate
      status={status}
      todoCount={todoCount}
      kpis={kpis}
      chart={chart}
      onRangeChange={(range: number) => {
        if (range === 7 || range === 30 || range === 90) setTrendRange(range);
      }}
      overviews={overviews}
      quickActions={quickActions}
    />
  );
}
