/* ============================================================
 * P4-2 · 运营工作台
 * 基于 DashboardTemplate 实例化
 * 欢迎条 + KPI ×4 + 趋势 Tab + 内容概览 ×3 + 快捷操作
 * 趋势图 slot 由 P7 注入（当前占位）
 * Source: 04 §5.2 / P4-2
 * ============================================================ */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty } from 'antd';
import { DashboardTemplate } from '@/templates/DashboardTemplate';
import type { DashboardStatus, KpiItem, OverviewSection, QuickAction } from '@/templates/DashboardTemplate';

export default function WorkbenchPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [overviews, setOverviews] = useState<OverviewSection[]>([]);
  const [todoCount, setTodoCount] = useState(0);

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

  const quickActions: QuickAction[] = [
    { key: 'newNovel', label: '新建作品', onClick: () => navigate('/novel/create') },
    { key: 'novelList', label: '作品管理', onClick: () => navigate('/novel') },
    { key: 'audit', label: '内容审核', onClick: () => navigate('/audit') },
    { key: 'user', label: '用户管理', onClick: () => navigate('/user') },
  ];

  // P7 图表未注入前用占位（趋势图 slot）
  const chartPlaceholder = (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Empty description="趋势图表（P7-基础图表注入后显示）" />
    </div>
  );

  return (
    <DashboardTemplate
      status={status}
      todoCount={todoCount}
      kpis={kpis}
      chart={chartPlaceholder}
      onRangeChange={() => {
        // P7 接入后按 range 请求趋势数据
      }}
      overviews={overviews}
      quickActions={quickActions}
    />
  );
}
