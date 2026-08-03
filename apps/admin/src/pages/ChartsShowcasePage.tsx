/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('basic');
  const [loading, setLoading] = useState(true);

  const [lineData, setLineData] = useState<Array<Record<string, unknown>>>([]);
  const [columnData, setColumnData] = useState<Array<Record<string, unknown>>>([]);
  const [pieData, setPieData] = useState<Array<Record<string, unknown>>>([]);
  const [areaData, setAreaData] = useState<Array<Record<string, unknown>>>([]);
  const [heatmapData, setHeatmapData] = useState<Array<Record<string, unknown>>>([]);
  const [gaugeValue, setGaugeValue] = useState(0);

  const [wordCountData, setWordCountData] = useState<any[]>([]);
  const [readingHeatmapData, setReadingHeatmapData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

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
        setLineData(basic.lineData);
        setColumnData(basic.columnData);
        setPieData(basic.pieData);
        setAreaData(basic.areaData);
        setHeatmapData(basic.heatmapData);
        setGaugeValue(basic.gaugeValue);
        setWordCountData(wc);
        setReadingHeatmapData(rh);
        setFunnelData(rf);
        setRankingData(rt);
        setCategoryData(cd);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const breadcrumb: BPageHeaderProps['breadcrumb'] = [
    { title: t('charts:breadcrumb.charts') },
    { title: t('charts:breadcrumb.showcase') },
  ];

  return (
    <div className="b-charts-showcase-page">
      <BPageHeader
        title={t('charts:title')}
        breadcrumb={breadcrumb}
        onBack={() => navigate('/workbench')}
        extra={
          <Space>
            <Tag color="processing">{t('charts:tags.palette')}</Tag>
            <Tag color="success">{t('charts:tags.darkMode')}</Tag>
            <Tag>{t('charts:tags.height')}</Tag>
          </Space>
        }
      />

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          options={[
            { label: t('charts:tabs.basic'), value: 'basic' },
            { label: t('charts:tabs.business'), value: 'business' },
          ]}
        />
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : tab === 'basic' ? (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title={t('charts:basic.line')} size="small">
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
            <Card title={t('charts:basic.column')} size="small">
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
            <Card title={t('charts:basic.pie')} size="small">
              <BPieChart
                data={pieData}
                angleField="value"
                colorField="type"
                ring
                statisticTitle={t('charts:basic.pieStatistic')}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title={t('charts:basic.area')} size="small">
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
            <Card title={t('charts:basic.heatmap')} size="small">
              <BHeatmap
                data={heatmapData}
                xField="hour"
                yField="day"
                colorField="value"
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title={t('charts:basic.gauge')} size="small">
              <BGauge value={gaugeValue} title={t('charts:basic.gaugeTitle')} />
            </Card>
          </Col>
        </Row>
      ) : (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title={t('charts:business.wordCount')} size="small" extra={<Tag color="warning">{t('charts:business.wordCountTag')}</Tag>}>
              <WordCountGrowthChart data={wordCountData} />
            </Card>
          </Col>
          <Col span={24}>
            <Card title={t('charts:business.readingHeatmap')} size="small" extra={<Tag color="processing">{t('charts:business.readingHeatmapTag')}</Tag>}>
              <ReadingHeatmap data={readingHeatmapData} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title={t('charts:business.funnel')} size="small" extra={<Tag color="error">{t('charts:business.funnelTag')}</Tag>}>
              <ReadingFunnel data={funnelData} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title={t('charts:business.ranking')} size="small" extra={<Tag color="success">{t('charts:business.rankingTag')}</Tag>}>
              <RankingTrendChart data={rankingData} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title={t('charts:business.category')} size="small" extra={<Tag>{t('charts:business.categoryTag')}</Tag>}>
              <CategoryDistributionChart data={categoryData} />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}