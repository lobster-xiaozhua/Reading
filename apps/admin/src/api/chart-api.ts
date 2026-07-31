/* ============================================================
 * P7 · 图表 Mock 数据 API
 * 工作台趋势图 + 图表展示页所需各类 mock 数据
 * Source: P7-7~11
 * ============================================================ */

import type {
  WordCountGrowthDatum,
  ReadingHeatmapDatum,
  FunnelStage,
  RankingTrendDatum,
  CategoryDatum,
} from '@novel/b-end';

function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

/** 工作台趋势数据（7/30/90 天） */
export type TrendRange = 7 | 30 | 90;

export interface WorkbenchTrendItem {
  date: string;
  /** 新增作品 */
  newNovels: number;
  /** 新增读者 */
  newReaders: number;
  /** 月票 */
  monthlyTickets: number;
}

export async function fetchWorkbenchTrend(range: TrendRange): Promise<WorkbenchTrendItem[]> {
  const now = Date.now();
  const data: WorkbenchTrendItem[] = Array.from({ length: range }).map((_, i) => {
    const date = new Date(now - (range - i - 1) * 86400000);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      newNovels: 8 + Math.floor(Math.random() * 20),
      newReaders: 5000 + Math.floor(Math.random() * 5000),
      monthlyTickets: 3000 + Math.floor(Math.random() * 8000),
    };
  });
  return delay(data, 250);
}

/** P7-7 字数增长曲线（30 天） */
export async function fetchWordCountGrowth(): Promise<WordCountGrowthDatum[]> {
  const now = Date.now();
  let total = 100000;
  const data: WordCountGrowthDatum[] = Array.from({ length: 30 }).map((_, i) => {
    const date = new Date(now - (29 - i) * 86400000);
    // 模拟偶尔断更
    const dailyWords = Math.random() > 0.85 ? Math.floor(Math.random() * 1500) : 2500 + Math.floor(Math.random() * 3500);
    total += dailyWords;
    return {
      date: `${date.getMonth() + 1}-${date.getDate()}`,
      dailyWords,
      totalWords: total,
    };
  });
  return delay(data, 250);
}

/** P7-8 阅读时长热力图（7×24） */
export async function fetchReadingHeatmap(): Promise<ReadingHeatmapDatum[]> {
  const data: ReadingHeatmapDatum[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // 模拟：晚间 20-23 点 + 周末活跃度高
      const isPeak = hour >= 19 && hour <= 23;
      const isWeekend = day >= 5;
      const base = isPeak ? 800 : isWeekend ? 400 : 200;
      const duration = base + Math.floor(Math.random() * 600);
      data.push({ day, hour, duration });
    }
  }
  return delay(data, 250);
}

/** P7-9 追更漏斗（5 层） */
export async function fetchReadingFunnel(): Promise<FunnelStage[]> {
  return delay([
    { stage: '发现', value: 100000 },
    { stage: '详情', value: 45000 },
    { stage: '加书架', value: 18000 },
    { stage: '开读', value: 12000 },
    { stage: '追更', value: 8500 },
  ], 250);
}

/** P7-10 排行趋势（当前作品 vs Top10 均值，14 天） */
export async function fetchRankingTrend(): Promise<RankingTrendDatum[]> {
  const now = Date.now();
  const data: RankingTrendDatum[] = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date(now - (13 - i) * 86400000);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
    // 当前作品：排名波动 1-5
    data.push({ date: dateStr, rank: 1 + Math.floor(Math.random() * 5), series: '当前作品' });
    // Top10 均值：6-9
    data.push({ date: dateStr, rank: 6 + Math.floor(Math.random() * 4), series: 'Top10 均值' });
  }
  return delay(data, 250);
}

/** P7-11 分类占比 */
export async function fetchCategoryDistribution(): Promise<CategoryDatum[]> {
  return delay([
    { category: '玄幻', count: 3280 },
    { category: '仙侠', count: 2150 },
    { category: '都市', count: 1840 },
    { category: '历史', count: 920 },
    { category: '科幻', count: 680 },
    { category: '悬疑', count: 520 },
    { category: '武侠', count: 410 },
    { category: '游戏', count: 380 },
    { category: '其他', count: 1200 },
  ], 250);
}

/** 基础图表展示页 mock 数据 */
export async function fetchBasicChartData() {
  return delay({
    lineData: Array.from({ length: 12 }).map((_, i) => ({
      month: `${i + 1}月`,
      value: 100 + i * 15 + Math.floor(Math.random() * 50),
      type: i % 2 === 0 ? '本站' : '竞品',
    })),
    columnData: Array.from({ length: 7 }).map((_, i) => ({
      day: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
      value: 200 + Math.floor(Math.random() * 800),
      type: i >= 5 ? '周末' : '工作日',
    })),
    pieData: [
      { type: '移动端', value: 65 },
      { type: 'PC端', value: 25 },
      { type: '平板', value: 10 },
    ],
    areaData: Array.from({ length: 30 }).map((_, i) => ({
      date: `7/${i + 1}`,
      pv: 5000 + Math.floor(Math.random() * 3000),
      uv: 2000 + Math.floor(Math.random() * 1500),
    })),
    heatmapData: Array.from({ length: 7 * 24 }).map((_, i) => ({
      day: Math.floor(i / 24),
      hour: i % 24,
      value: Math.floor(Math.random() * 100),
    })),
    gaugeValue: 0.78,
  }, 300);
}
