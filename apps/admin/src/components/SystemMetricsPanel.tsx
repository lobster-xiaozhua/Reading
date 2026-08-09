/* ============================================================
 * 统一控制面板 · 系统可观测性区
 * 四卡指标（HTTP 请求量 / 缓存命中率 BGauge / 慢 SQL / 慢命令）
 * + HTTP Top 10 柱状 + 热 key 模式分组柱 + 慢 SQL / 慢命令列表
 * 数据源：GET /workbench/system-metrics
 * ============================================================ */

import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Col, Empty, List, Result, Row, Skeleton, Statistic, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import type { SystemMetricsSnapshot } from "@/api/fetcher";
import "./SystemMetricsPanel.css";

const BColumnChart = lazy(() => import("@novel/b-end").then(m => ({ default: m.BColumnChart })));
const BGauge = lazy(() => import("@novel/b-end").then(m => ({ default: m.BGauge })));

export interface SystemMetricsPanelProps {
  data: SystemMetricsSnapshot | null;
  loading: boolean;
  hasError: boolean;
  onRetry?: () => void;
}

function LazyChart({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Skeleton active style={{ height: 240 }} />}>{children}</Suspense>;
}

export function SystemMetricsPanel({
  data,
  loading,
  hasError,
  onRetry,
}: SystemMetricsPanelProps) {
  const { t } = useTranslation();

  if (hasError) {
    return (
      <Card title={t("workbench:system.title")}>
        <Result
          status="warning"
          title={t("workbench:system.loadFailed")}
          extra={
            <Button icon={<ReloadOutlined />} onClick={onRetry}>
              {t("workbench:system.retry")}
            </Button>
          }
        />
      </Card>
    );
  }

  if (loading || !data) {
    return (
      <Card title={t("workbench:system.title")}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  const httpTopData = data.httpTopPaths.map((p) => ({
    path: p.path,
    count: p.count,
    error: p.errorCount,
  }));

  const hotKeyData = data.redisPatterns.flatMap((p) => [
    { pattern: p.pattern, type: t("workbench:system.hitRate"), value: p.hits },
    { pattern: p.pattern, type: "Miss", value: p.misses },
  ]);

  const emptyTop = data.httpTopPaths.length === 0;

  return (
    <Card
      title={t("workbench:system.title")}
      extra={
        <Button type="link" size="small" icon={<ReloadOutlined />} onClick={onRetry}>
          {t("workbench:system.retry")}
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic
              title={t("workbench:system.httpTotal")}
              value={data.httpTotal}
              suffix={t("workbench:system.unitRequests")}
            />
            <div className="smp-sub">
              {t("workbench:system.httpErrorTotal")} {data.httpErrorTotal}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small" className="smp-gauge-card">
            <LazyChart>
              <BGauge
                value={data.redisHitRate}
                max={1}
                title={`${Math.round(data.redisHitRate * 100)}%`}
                height={140}
              />
            </LazyChart>
            <div className="smp-gauge-label">{t("workbench:system.hitRate")}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic
              title={t("workbench:system.slowQuery")}
              value={data.slowQueryCount}
              suffix={t("workbench:system.durationMs")}
            />
            <div className="smp-sub">
              avg {data.slowQueryAvgMs}ms
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card size="small">
            <Statistic
              title={t("workbench:system.slowCommand")}
              value={data.redisSlowCommands.length}
            />
            <div className="smp-sub">
              {data.redisCommandCalls.length} cmd types
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            size="small"
            title={t("workbench:system.httpTop")}
            extra={
              <Tag color="processing">
                avg {data.httpAvgDurationMs}ms
              </Tag>
            }
          >
            {emptyTop ? (
              <Empty description={t("workbench:system.noData")} />
            ) : (
              <LazyChart>
                <BColumnChart
                  data={httpTopData}
                  xField="path"
                  yField="count"
                  height={240}
                  showLegend={false}
                />
              </LazyChart>
            )}
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card
            size="small"
            title={t("workbench:system.hotKeys")}
            extra={
              <Tag color="success">
                H {data.redisHits} / M {data.redisMisses}
              </Tag>
            }
          >
            {data.redisPatterns.length === 0 ? (
              <Empty description={t("workbench:system.noData")} />
            ) : (
              <LazyChart>
                <BColumnChart
                  data={hotKeyData}
                  xField="pattern"
                  yField="value"
                  seriesField="type"
                  isGroup
                  height={240}
                />
              </LazyChart>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card size="small" title={t("workbench:system.slowQueryList")}>
            {data.slowQueryTop.length === 0 ? (
              <Empty description={t("workbench:system.noData")} />
            ) : (
              <List
                size="small"
                dataSource={data.slowQueryTop}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span className="smp-stmt">{item.text}</span>
                      }
                    />
                    <Tag color={item.durationMs >= 500 ? "error" : "warning"}>
                      {item.durationMs}ms
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card size="small" title={t("workbench:system.slowCommandList")}>
            {data.redisSlowCommands.length === 0 ? (
              <Empty description={t("workbench:system.noData")} />
            ) : (
              <List
                size="small"
                dataSource={data.redisSlowCommands}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<span className="smp-stmt">{item.text}</span>}
                    />
                    <Tag color={item.durationMs >= 200 ? "error" : "warning"}>
                      {item.durationMs}ms
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </Card>
  );
}
