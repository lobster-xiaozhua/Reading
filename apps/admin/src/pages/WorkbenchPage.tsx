/* ============================================================
 * P4-2 · 运营工作台
 * 基于 DashboardTemplate 实例化
 * 欢迎条 + KPI ×4 + 趋势 Tab + 内容概览 ×3 + 快捷操作
 * P7 已接入真实趋势图（BLineChart）
 * Source: 04 §5.2 / P4-2
 * ============================================================ */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardTemplate } from '@/templates/DashboardTemplate';
import type { DashboardStatus, KpiItem, OverviewSection, QuickAction } from '@/templates/DashboardTemplate';
import { BLineChart } from '@novel/b-end';
import { fetchWorkbenchTrend, type TrendRange, type WorkbenchTrendItem } from '@/api/chart-api';

export default function WorkbenchPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [overviews, setOverviews] = useState<OverviewSection[]>([]);
  const [todoCount, setTodoCount] = useState(0);
  const [trendRange, setTrendRange] = useState<TrendRange>(30);
  const [trendData, setTrendData] = useState<WorkbenchTrendItem[]>([]);
  const [trendMetric, setTrendMetric] = useState<'newNovels' | 'newReaders' | 'monthlyTickets'>('newReaders');

  useEffect(() => {
    const timer = setTimeout(() => {
      setKpis([
        { key: 'newNovels', title: '今日新增作品', value: 12, suffix: '部', trend: 'up', trendText: '+8.2%', trendLabel: '较昨日' },
        { key: 'activeReaders', title: '活跃读者', value: 8652, trend: 'up', trendText: '+3.1%', trendLabel: '较昨日' },
        { key: 'monthlyTickets', title: '月票总量', value: 128450, trend: 'up', trendText: '+15.6%', trendLabel: '较上周' },
        { key: 'pendingAudit', title: '待审核', value: 5, suffix: '条', trend: 'down', trendText: '-2', trendLabel: '较昨日' },
      ]);
      setOverviews([
        {
          key: 'latest',
          title: '最新作品 Top5',
          items: [
            { id: '1', title: '斗破苍穹', description: '作者：天蚕土豆 · 玄幻', extra: '2 小时前' },
            { id: '2', title: '凡人修仙传', description: '作者：忘语 · 仙侠', extra: '3 小时前' },
            { id: '3', title: '遮天', description: '作者：辰东 · 玄幻', extra: '5 小时前' },
            { id: '4', title: '诡秘之主', description: '作者：爱潜水的乌贼 · 悬疑', extra: '6 小时前' },
            { id: '5', title: '大奉打更人', description: '作者：卖报小郎君 · 仙侠', extra: '8 小时前' },
          ],
        },
        {
          key: 'pending',
          title: '待审核 Top5',
          items: [
            { id: '1', title: '第 1024 章 逆天改命', description: '《斗破苍穹》· 敏感词 2 处', extra: '10 分钟前' },
            { id: '2', title: '第 512 章 突破', description: '《凡人修仙传》· 初审', extra: '25 分钟前' },
            { id: '3', title: '第 888 章 归来', description: '《遮天》· 复审', extra: '1 小时前' },
            { id: '4', title: '第 256 章 真相', description: '《诡秘之主》· 初审', extra: '2 小时前' },
            { id: '5', title: '第 66 章 升级', description: '《大奉打更人》· 终审', extra: '3 小时前' },
          ],
        },
        {
          key: 'reports',
          title: '举报处理 Top5',
          items: [
            { id: '1', title: '违规内容举报', description: '《某作品》第 100 章', extra: '待处理' },
            { id: '2', title: '抄袭申诉', description: '《某作品》vs《另一作品》', extra: '处理中' },
            { id: '3', title: '广告内容', description: '《某作品》评论区', extra: '已处理' },
          ],
        },
      ]);
      setTodoCount(5);
      setStatus('ready');
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // P7 趋势图数据加载
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

  // P7 趋势图：多指标切换
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
        data={trendData as never}
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
