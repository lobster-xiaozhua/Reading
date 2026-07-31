/* ============================================================
 * P7 · 数据可视化看板
 * 展示 6 基础图表 + 5 小说专用图表
 * 用于验证图表规范、暗黑模式、空数据、交互
 * Source: P7-2~11
 * ============================================================ */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Segmented, Skeleton, Space, Tag } from 'antd';
import { BPageHeader } from '@novel/b-end';
import type { BPageHeaderProps } from '@novel/b-end';
import {
  BLineChart,
  BColumnChart,
  BPieChart,
  BAreaChart,
  BHeatmap,
  BGauge,
  WordCountGrowthChart,
  ReadingHeatmap,
  ReadingFunnel,
  RankingTrendChart,
  CategoryDistributionChart,
} from '@novel/b-end';
import {
  fetchBasicChartData,
  fetchWordCountGrowth,
  fetchReadingHeatmap,
  fetchReadingFunnel,
  fetchRankingTrend,
  fetchCategoryDistribution,
} from '@/api/chart-api';

type Tab = 'basic' | 'business';

export default function ChartsShowcasePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('basic');
  const [loading, setLoading] = useState(true);

  // 基础图表数据
  const [lineData, setLineData] = useState<Array<Record<string, unknown>>>([]);
  const [columnData, setColumnData] = useState<Array<Record<string, unknown>>>([]);
  const [pieData, setPieData] = useState<Array<Record<string, unknown>>>([]);
  const [areaData, setAreaData] = useState<Array<Record<string, unknown>>>([]);
  const [heatmapData, setHeatmapData] = useState<Array<Record<string, unknown>>>([]);
  const [gaugeValue, setGaugeValue] = useState(0);

  // 业务图表数据
  const [wordCountData, setWordCountData] = useState<never[]>([]);
  const [readingHeatmapData, setReadingHeatmapData] = useState<never[]>([]);
  const [funnelData, setFunnelData] = useState<never[]>([]);
  const [rankingData, setRankingData] = useState<never[]>([]);
  const [categoryData, setCategoryData] = useState<never[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [basic, wc, rh, rf, rt, cd] = await Promise.all([
          fetchBasicChartData(),
          fetchWordCountGrowth(),
          fetchReadingHeatmap(),
          fetchReadingFunnel(),
          fetchRankingTrend(),
          fetchCategoryDistribution(),
        ]);
        if (cancelled) return;
        setLineData(basic.lineData as never);
        setColumnData(basic.columnData as never);
        setPieData(basic.pieData as never);
        setAreaData(basic.areaData as never);
        setHeatmapData(basic.heatmapData as never);
        setGaugeValue(basic.gaugeValue);
        setWordCountData(wc as never);
        setReadingHeatmapData(rh as never);
        setFunnelData(rf as never);
        setRankingData(rt as never);
        setCategoryData(cd as never);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const breadcrumb: BPageHeaderProps['breadcrumb'] = [
    { title: '数据可视化' },
    { title: '图表展示' },
  ];

  return (
    <div className="b-charts-showcase-page">
      <BPageHeader
        title="数据可视化看板"
        breadcrumb={breadcrumb}
        onBack={() => navigate('/workbench')}
        extra={
          <Space>
            <Tag color="processing">chart-1~6 色板</Tag>
            <Tag color="success">暗黑模式适配</Tag>
            <Tag>高度 320px</Tag>
          </Space>
        }
      />

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          options={[
            { label: '基础图表（6）', value: 'basic' },
            { label: '小说专用图表（5）', value: 'business' },
          ]}
        />
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : tab === 'basic' ? (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="折线图 BLineChart" size="small">
              <BLineChart
                data={lineData}
                xField="month"
                yField="value"
                seriesField="type"
                smooth
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="柱状图 BColumnChart" size="small">
              <BColumnChart
                data={columnData}
                xField="day"
                yField="value"
                seriesField="type"
                isGroup
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="饼图 BPieChart（环形）" size="small">
              <BPieChart
                data={pieData}
                angleField="value"
                colorField="type"
                ring
                statisticTitle="设备分布"
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="面积图 BAreaChart" size="small">
              <BAreaChart
                data={areaData}
                xField="date"
                yField="pv"
                seriesField="pv"
                areaOpacity={0.2}
                smooth
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="热力图 BHeatmap" size="small">
              <BHeatmap
                data={heatmapData}
                xField="hour"
                yField="day"
                colorField="value"
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="仪表盘 BGauge" size="small">
              <BGauge value={gaugeValue} title="目标达成率" />
            </Card>
          </Col>
        </Row>
      ) : (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="P7-7 字数增长曲线（双轴）" size="small" extra={<Tag color="warning">{`日更 <2000 警戒线`}</Tag>}>
              <WordCountGrowthChart data={wordCountData as never} />
            </Card>
          </Col>
          <Col span={24}>
            <Card title="P7-8 阅读时长热力图（7×24）" size="small" extra={<Tag color="processing">晚间 19-23 点活跃</Tag>}>
              <ReadingHeatmap data={readingHeatmapData as never} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="P7-9 追更漏斗" size="small" extra={<Tag color="error">{`转化率 <10% 标注`}</Tag>}>
              <ReadingFunnel data={funnelData as never} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="P7-10 排行趋势" size="small" extra={<Tag color="success">当前作品加粗</Tag>}>
              <RankingTrendChart data={rankingData as never} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="P7-11 分类占比（环形）" size="small" extra={<Tag>Top6 后合并其他</Tag>}>
              <CategoryDistributionChart data={categoryData as never} />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
