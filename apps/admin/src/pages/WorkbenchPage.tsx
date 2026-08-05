import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import { DashboardTemplate } from '@/templates/DashboardTemplate';
import type { DashboardStatus, KpiItem, OverviewSection, QuickAction } from '@/templates/DashboardTemplate';
import { BLineChart } from '@novel/b-end';
import { fetcher } from '@/api/fetcher';
import { fetchWorkbenchTrend, type TrendRange, type WorkbenchTrendItem } from '@/api/chart-api';
import './WorkbenchPage.css';

export default function WorkbenchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [overviews, setOverviews] = useState<OverviewSection[]>([]);
  const [todoCount, setTodoCount] = useState(0);
  const [chartLoading, setChartLoading] = useState(true);
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
          { key: 'totalNovels', title: t('workbench:totalNovels'), value: kpi.totalNovels, suffix: t('workbench:unitNovel'), trend: 'up', trendText: `${kpi.publishedNovels} ${t('workbench:published')}`, trendLabel: '' },
          { key: 'pendingAudit', title: t('workbench:pendingAudit'), value: kpi.pendingAudit, suffix: t('workbench:unitAudit'), trend: kpi.pendingAudit > 0 ? 'down' : 'up', trendText: '', trendLabel: t('workbench:needHandle') },
          { key: 'totalAuthors', title: t('workbench:totalAuthors'), value: kpi.totalAuthors, suffix: t('workbench:unitPeople'), trend: 'up', trendText: '', trendLabel: '' },
          { key: 'totalReaders', title: t('workbench:totalReaders'), value: kpi.totalReaders, suffix: t('workbench:unitPeople'), trend: 'up', trendText: '', trendLabel: '' },
        ]);
        setTodoCount(kpi.pendingAudit);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    async function loadOverviews() {
      try {
        const items = await fetcher.workbench.getOverviews();
        if (cancelled) return;
        setOverviews([{
          key: 'overview',
          title: t('workbench:overview'),
          items: items.map((item: { key: string; label: string; value: number; icon: string }) => ({
            id: item.key,
            title: item.label,
            description: `${item.value}`,
          })),
        }]);
      } catch {
        // overviews 加载失败不影响页面主体
      }
    }
    load();
    loadOverviews();
    return () => { cancelled = true; };
  }, [t]);

  const loadTrend = useCallback(async (range: TrendRange) => {
    setChartLoading(true);
    try {
      const data = await fetchWorkbenchTrend(range);
      setTrendData(data);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrend(trendRange);
  }, [trendRange, loadTrend]);

  const quickActions: QuickAction[] = [
    { key: 'newNovel', label: t('workbench:newNovel'), onClick: () => navigate('/novel/create') },
    { key: 'novelList', label: t('workbench:novelManage'), onClick: () => navigate('/novel') },
    { key: 'audit', label: t('workbench:auditManage'), onClick: () => navigate('/audit') },
    { key: 'charts', label: t('workbench:charts'), onClick: () => navigate('/charts') },
  ];

  const metricLabel: Record<typeof trendMetric, string> = {
    newNovels: t('workbench:newNovels'),
    newReaders: t('workbench:newReaders'),
    monthlyTickets: t('workbench:monthlyTickets'),
  };

  const chart = (
    <div className="wp-chart-wrapper">
      <div className="wp-chart-header">
        <span className="wp-chart-title">
          {metricLabel[trendMetric]}{t('workbench:trend')}
        </span>
        <div className="wp-metric-group">
          {(['newNovels', 'newReaders', 'monthlyTickets'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTrendMetric(m)}
              className={`wp-metric-btn${trendMetric === m ? ' wp-metric-btn--active' : ''}`}
              aria-label={metricLabel[m]}
              aria-pressed={trendMetric === m}
            >
              {metricLabel[m]}
            </button>
          ))}
        </div>
      </div>
      {chartLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} style={{ padding: 'var(--space-4)' }} />
      ) : (
        <div className="wp-chart-fade-in">
          <BLineChart
            data={trendData as unknown as Record<string, unknown>[]}
            xField="date"
            yField={trendMetric}
            height={300}
            smooth
            showLegend={false}
          />
        </div>
      )}
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