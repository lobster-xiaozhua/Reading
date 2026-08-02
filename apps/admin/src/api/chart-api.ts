import type {
  WordCountGrowthDatum,
  ReadingHeatmapDatum,
  FunnelStage as FunnelStageBEnd,
  RankingTrendDatum,
  CategoryDatum,
} from '@novel/b-end';
import { http } from './http';

export type TrendRange = 7 | 30 | 90;

export interface WorkbenchTrendItem {
  date: string;
  newNovels: number;
  newReaders: number;
  monthlyTickets: number;
}

export async function fetchWorkbenchTrend(range: TrendRange): Promise<WorkbenchTrendItem[]> {
  const data = await http.get<{ date: string; value: number }[]>('/charts/workbench-trend', { range });
  return data.map((d) => ({
    date: d.date,
    newNovels: Math.round(d.value * 0.3),
    newReaders: Math.round(d.value * 0.5),
    monthlyTickets: Math.round(d.value * 0.2),
  }));
}

export async function fetchWordCountGrowth(): Promise<WordCountGrowthDatum[]> {
  const data = await http.get<{ daily: { date: string; value: number }[]; cumulative: { date: string; value: number }[] }>(
    '/charts/word-count-growth', { days: 30 }
  );
  const dailyMap = new Map(data.daily.map((d) => [d.date, d.value]));
  let total = 0;
  const allDates = [...new Set([...data.daily.map((d) => d.date), ...data.cumulative.map((d) => d.date)])].sort();
  return allDates.map((date) => {
    total += dailyMap.get(date) || 0;
    return { date, dailyWords: dailyMap.get(date) || 0, totalWords: total };
  });
}

export async function fetchReadingHeatmap(): Promise<ReadingHeatmapDatum[]> {
  const data = await http.get<{ day: number; hour: number; value: number }[]>('/charts/reading-heatmap');
  return data.map((d) => ({ day: d.day, hour: d.hour, duration: d.value }));
}

export async function fetchReadingFunnel(): Promise<FunnelStageBEnd[]> {
  const data = await http.get<{ stage: string; label: string; count: number }[]>('/charts/reading-funnel');
  return data.map((d) => ({ stage: d.stage, value: d.count }));
}

export async function fetchRankingTrend(): Promise<RankingTrendDatum[]> {
  const data = await http.get<{ date: string; rank: number; series: string }[]>('/charts/ranking-trend', { days: 14 });
  return data;
}

export async function fetchCategoryDistribution(): Promise<CategoryDatum[]> {
  const data = await http.get<{ category: string; count: number }[]>('/charts/category-distribution');
  return data;
}

export async function fetchBasicChartData() {
  return {
    lineData: [
      { month: '1月', value: 120, type: '本站' },
      { month: '1月', value: 100, type: '竞品' },
      { month: '2月', value: 150, type: '本站' },
      { month: '2月', value: 110, type: '竞品' },
      { month: '3月', value: 180, type: '本站' },
      { month: '3月', value: 130, type: '竞品' },
      { month: '4月', value: 200, type: '本站' },
      { month: '4月', value: 160, type: '竞品' },
      { month: '5月', value: 220, type: '本站' },
      { month: '5月', value: 180, type: '竞品' },
      { month: '6月', value: 250, type: '本站' },
      { month: '6月', value: 200, type: '竞品' },
    ],
    columnData: [
      { day: '周一', value: 400, type: '工作日' },
      { day: '周二', value: 380, type: '工作日' },
      { day: '周三', value: 420, type: '工作日' },
      { day: '周四', value: 390, type: '工作日' },
      { day: '周五', value: 450, type: '工作日' },
      { day: '周六', value: 680, type: '周末' },
      { day: '周日', value: 720, type: '周末' },
    ],
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
  };
}
