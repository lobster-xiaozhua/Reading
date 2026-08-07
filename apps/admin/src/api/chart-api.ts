import type {
  WordCountGrowthDatum,
  ReadingHeatmapDatum,
  FunnelStage as FunnelStageBEnd,
  RankingTrendDatum,
  CategoryDatum,
} from "@novel/b-end";
import { http } from "./http";

export type TrendRange = 7 | 30 | 90;

export interface WorkbenchTrendItem {
  date: string;
  newNovels: number;
  newReaders: number;
  monthlyTickets: number;
}

export async function fetchWorkbenchTrend(
  range: TrendRange,
): Promise<WorkbenchTrendItem[]> {
  const data = await http.get<{ date: string; value: number }[]>(
    "/charts/workbench-trend",
    { range },
  );
  return data.map((d) => ({
    date: d.date,
    newNovels: Math.round(d.value * 0.3),
    newReaders: Math.round(d.value * 0.5),
    monthlyTickets: Math.round(d.value * 0.2),
  }));
}

export async function fetchWordCountGrowth(): Promise<WordCountGrowthDatum[]> {
  const data = await http.get<{
    daily: { date: string; value: number }[];
    cumulative: { date: string; value: number }[];
  }>("/charts/word-count-growth", { days: 30 });
  const dailyMap = new Map(data.daily.map((d) => [d.date, d.value]));
  let total = 0;
  const allDates = [
    ...new Set([
      ...data.daily.map((d) => d.date),
      ...data.cumulative.map((d) => d.date),
    ]),
  ].sort();
  return allDates.map((date) => {
    total += dailyMap.get(date) || 0;
    return { date, dailyWords: dailyMap.get(date) || 0, totalWords: total };
  });
}

export async function fetchReadingHeatmap(): Promise<ReadingHeatmapDatum[]> {
  const data = await http.get<{ day: number; hour: number; value: number }[]>(
    "/charts/reading-heatmap",
  );
  return data.map((d) => ({ day: d.day, hour: d.hour, duration: d.value }));
}

export async function fetchReadingFunnel(): Promise<FunnelStageBEnd[]> {
  const data = await http.get<
    { stage: string; label: string; count: number }[]
  >("/charts/reading-funnel");
  return data.map((d) => ({ stage: d.stage, value: d.count }));
}

export async function fetchRankingTrend(): Promise<RankingTrendDatum[]> {
  const data = await http.get<{ date: string; rank: number; series: string }[]>(
    "/charts/ranking-trend",
    { days: 14 },
  );
  return data;
}

export async function fetchCategoryDistribution(): Promise<CategoryDatum[]> {
  const data = await http.get<{ category: string; count: number }[]>(
    "/charts/category-distribution",
  );
  return data;
}

export async function fetchBasicChartData() {
  const data = await http.get<{
    type: string;
    data: Record<string, unknown>[];
  }>("/charts/basic", { type: "all" });
  return {
    lineData:
      (data.data as { month: string; value: number; type: string }[]) || [],
    columnData:
      (data.data as { day: string; value: number; type: string }[]) || [],
    pieData: (data.data as { type: string; value: number }[]) || [],
    areaData: (data.data as { date: string; pv: number; uv: number }[]) || [],
    heatmapData:
      (data.data as { day: number; hour: number; value: number }[]) || [],
    gaugeValue: 0.78,
  };
}
