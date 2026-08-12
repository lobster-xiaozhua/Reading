import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, Col, Row, Skeleton, Tag, Button, Empty } from "antd";
import { DashboardTemplate } from "@/templates/DashboardTemplate";
import type {
  DashboardStatus,
  KpiItem,
  OverviewSection,
  QuickAction,
} from "@/templates/DashboardTemplate";
import { fetcher } from "@/api/fetcher";
import type { SystemMetricsSnapshot } from "@/api/fetcher";
import { SystemMetricsPanel } from "@/components/SystemMetricsPanel";
import {
  fetchWorkbenchTrend,
  fetchWordCountGrowth,
  fetchReadingHeatmap,
  fetchReadingFunnel,
  fetchRankingTrend,
  fetchCategoryDistribution,
  type TrendRange,
  type WorkbenchTrendItem,
} from "@/api/chart-api";
import "./WorkbenchPage.css";

const BLineChart = lazy(() => import("@novel/b-end").then(m => ({ default: m.BLineChart })));
const WordCountGrowthChart = lazy(() => import("@novel/b-end").then(m => ({ default: m.WordCountGrowthChart })));
const ReadingHeatmap = lazy(() => import("@novel/b-end").then(m => ({ default: m.ReadingHeatmap })));
const ReadingFunnel = lazy(() => import("@novel/b-end").then(m => ({ default: m.ReadingFunnel })));
const RankingTrendChart = lazy(() => import("@novel/b-end").then(m => ({ default: m.RankingTrendChart })));
const CategoryDistributionChart = lazy(() => import("@novel/b-end").then(m => ({ default: m.CategoryDistributionChart })));

function LazyChart({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Skeleton active style={{ height: 260 }} />}>{children}</Suspense>;
}

export default function WorkbenchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [overviews, setOverviews] = useState<OverviewSection[]>([]);
  const [todoCount, setTodoCount] = useState(0);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState(false);
  const [trendRange, setTrendRange] = useState<TrendRange>(30);
  const [trendData, setTrendData] = useState<WorkbenchTrendItem[]>([]);
  const [trendMetric, setTrendMetric] = useState<
    "newNovels" | "newReaders" | "monthlyTickets"
  >("newReaders");

  /* 业务图表区 */
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState(false);
  const [businessRetry, setBusinessRetry] = useState(0);
  const [wordCountData, setWordCountData] = useState<Awaited<ReturnType<typeof fetchWordCountGrowth>>>([]);
  const [readingHeatmapData, setReadingHeatmapData] = useState<Awaited<ReturnType<typeof fetchReadingHeatmap>>>([]);
  const [funnelData, setFunnelData] = useState<Awaited<ReturnType<typeof fetchReadingFunnel>>>([]);
  const [rankingData, setRankingData] = useState<Awaited<ReturnType<typeof fetchRankingTrend>>>([]);
  const [categoryData, setCategoryData] = useState<Awaited<ReturnType<typeof fetchCategoryDistribution>>>([]);

  /* 系统可观测性区 */
  const [sysLoading, setSysLoading] = useState(true);
  const [sysError, setSysError] = useState(false);
  const [sysRetry, setSysRetry] = useState(0);
  const [sysMetrics, setSysMetrics] = useState<SystemMetricsSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const kpi = await fetcher.workbench.getKpiCards();
        if (cancelled) return;
        setKpis([
          {
            key: "totalNovels",
            title: t("workbench:totalNovels"),
            value: kpi.totalNovels,
            suffix: t("workbench:unitNovel"),
            trend: "up",
            trendText: `${kpi.publishedNovels} ${t("workbench:published")}`,
            trendLabel: "",
          },
          {
            key: "pendingAudit",
            title: t("workbench:pendingAudit"),
            value: kpi.pendingAudit,
            suffix: t("workbench:unitAudit"),
            trend: kpi.pendingAudit > 0 ? "down" : "up",
            trendText: "",
            trendLabel: t("workbench:needHandle"),
          },
          {
            key: "totalAuthors",
            title: t("workbench:totalAuthors"),
            value: kpi.totalAuthors,
            suffix: t("workbench:unitPeople"),
            trend: "up",
            trendText: "",
            trendLabel: "",
          },
          {
            key: "totalReaders",
            title: t("workbench:totalReaders"),
            value: kpi.totalReaders,
            suffix: t("workbench:unitPeople"),
            trend: "up",
            trendText: "",
            trendLabel: "",
          },
        ]);
        setTodoCount(kpi.pendingAudit);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    async function loadOverviews() {
      try {
        const items = await fetcher.workbench.getOverviews();
        if (cancelled) return;
        setOverviews([
          {
            key: "overview",
            title: t("workbench:overview"),
            items: items.map(
              (item: {
                key: string;
                label: string;
                value: number;
                icon: string;
              }) => ({
                id: item.key,
                title: item.label,
                description: `${item.value}`,
              }),
            ),
          },
        ]);
      } catch {
        // overviews 加载失败不影响页面主体
      }
    }
    load();
    loadOverviews();
    return () => {
      cancelled = true;
    };
  }, [t]);

  /* 业务图表数据 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusinessLoading(true);
      setBusinessError(false);
      try {
        const [wc, rh, rf, rt, cd] = await Promise.all([
          fetchWordCountGrowth(),
          fetchReadingHeatmap(),
          fetchReadingFunnel(),
          fetchRankingTrend(),
          fetchCategoryDistribution(),
        ]);
        if (cancelled) return;
        setWordCountData(wc);
        setReadingHeatmapData(rh);
        setFunnelData(rf);
        setRankingData(rt);
        setCategoryData(cd);
      } catch {
        if (!cancelled) setBusinessError(true);
      } finally {
        if (!cancelled) setBusinessLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessRetry]);

  /* 系统可观测性数据 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSysLoading(true);
      setSysError(false);
      try {
        const data = await fetcher.workbench.getSystemMetrics();
        if (cancelled) return;
        setSysMetrics(data);
      } catch {
        if (!cancelled) setSysError(true);
      } finally {
        if (!cancelled) setSysLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sysRetry]);

  const loadTrend = useCallback(async (range: TrendRange) => {
    setChartLoading(true);
    setChartError(false);
    try {
      const data = await fetchWorkbenchTrend(range);
      setTrendData(data);
    } catch {
      setChartError(true);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrend(trendRange);
  }, [trendRange, loadTrend]);

  const quickActions: QuickAction[] = [
    {
      key: "newNovel",
      label: t("workbench:newNovel"),
      onClick: () => navigate("/novel/create"),
    },
    {
      key: "novelList",
      label: t("workbench:novelManage"),
      onClick: () => navigate("/novel"),
    },
    {
      key: "audit",
      label: t("workbench:auditManage"),
      onClick: () => navigate("/audit"),
    },
    {
      key: "charts",
      label: t("workbench:charts"),
      onClick: () => navigate("/charts"),
    },
  ];

  const metricLabel: Record<typeof trendMetric, string> = {
    newNovels: t("workbench:newNovels"),
    newReaders: t("workbench:newReaders"),
    monthlyTickets: t("workbench:monthlyTickets"),
  };

  const chart = (
    <div className="wp-chart-wrapper">
      <div className="wp-chart-header">
        <span className="wp-chart-title">
          {metricLabel[trendMetric]}
          {t("workbench:trend")}
        </span>
        <div className="wp-metric-group">
          {(["newNovels", "newReaders", "monthlyTickets"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTrendMetric(m)}
              className={`wp-metric-btn${trendMetric === m ? " wp-metric-btn--active" : ""}`}
              aria-label={metricLabel[m]}
              aria-pressed={trendMetric === m}
            >
              {metricLabel[m]}
            </button>
          ))}
        </div>
      </div>
      {chartLoading ? (
        <Skeleton
          active
          paragraph={{ rows: 6 }}
          style={{ padding: "var(--space-4)" }}
        />
      ) : chartError ? (
        <div className="wp-chart-error">
          <span>{t("workbench:chartLoadFailed")}</span>
          <Button size="small" onClick={() => void loadTrend(trendRange)}>
            {t("common:retry")}
          </Button>
        </div>
      ) : (
        <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} style={{ padding: "var(--space-4)" }} />}>
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
        </Suspense>
      )}
    </div>
  );

  /* 业务图表区（统一控制面板） */
  const businessCharts = (
    <Card title={t("workbench:businessCharts")}>
      {businessLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : businessError ? (
        <Empty
          description={t("workbench:businessLoadFailed")}
        >
          <Button
            type="primary"
            onClick={() => setBusinessRetry((n) => n + 1)}
          >
            {t("common:retry")}
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card size="small" title={t("charts:business.wordCount")}>
              <LazyChart><WordCountGrowthChart data={wordCountData} height={240} /></LazyChart>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title={t("charts:business.funnel")}>
              <LazyChart><ReadingFunnel data={funnelData} height={240} /></LazyChart>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title={t("charts:business.ranking")}>
              <LazyChart><RankingTrendChart data={rankingData} height={240} /></LazyChart>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title={t("charts:business.category")}>
              <LazyChart><CategoryDistributionChart data={categoryData} height={240} /></LazyChart>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              size="small"
              title={t("charts:business.readingHeatmap")}
              extra={<Tag color="processing">{t("charts:business.readingHeatmapTag")}</Tag>}
            >
              <LazyChart><ReadingHeatmap data={readingHeatmapData} height={240} /></LazyChart>
            </Card>
          </Col>
        </Row>
      )}
    </Card>
  );

  const systemSection = (
    <SystemMetricsPanel
      data={sysMetrics}
      loading={sysLoading}
      hasError={sysError}
      onRetry={() => setSysRetry((n) => n + 1)}
    />
  );

  return (
    <DashboardTemplate
      status={status}
      todoCount={todoCount}
      onTodoClick={() => navigate("/audit")}
      kpis={kpis}
      chart={chart}
      trendRange={trendRange}
      onRangeChange={(range: number) => {
        if (range === 7 || range === 30 || range === 90) setTrendRange(range);
      }}
      overviews={overviews}
      businessCharts={businessCharts}
      systemSection={systemSection}
      quickActions={quickActions}
    />
  );
}
