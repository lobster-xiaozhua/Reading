/* ============================================================
 * P3-2 · 工作台模板 DashboardTemplate
 * 欢迎条 + KPI 网格（4 列 StatisticCard）+ 趋势图表 + 内容概览（3 列）+ 快捷操作
 * 状态变体：数据加载 / 无数据 / 图表错误
 * Source: 04 §5.2
 * ============================================================ */

import { useMemo } from "react";
import { Card, Skeleton, Result, Button, Empty, List } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { BStatisticCard } from "@novel/b-end";
import type { StatisticTrend } from "@novel/b-end";
import { useAuthStore } from "@/stores/authStore";
import "./DashboardTemplate.css";

export type DashboardStatus =
  "loading" | "ready" | "empty" | "error" | "chart-error";

export interface KpiItem {
  key: string;
  title: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  trend?: StatisticTrend;
  trendText?: string;
  trendLabel?: string;
  sparkline?: number[];
}

export interface OverviewItem {
  id: string;
  title: string;
  description: string;
  extra?: string;
}

export interface OverviewSection {
  key: string;
  title: string;
  items: OverviewItem[];
}

export interface QuickAction {
  key: string;
  label: string;
  onClick: () => void;
}

export interface DashboardTemplateProps {
  /** 状态 */
  status: DashboardStatus;
  /** 趋势图加载失败重试 */
  onChartRetry?: () => void;

  /* ---------- 欢迎条 ---------- */
  /** 待办计数（显示在欢迎条右侧） */
  todoCount?: number;

  /* ---------- KPI ---------- */
  kpis?: KpiItem[];

  /* ---------- 趋势图表 ---------- */
  /** 趋势图节点（图表由 P7 提供，模板留 slot） */
  chart?: React.ReactNode;
  /** 趋势 Tab 切换回调 */
  onRangeChange?: (range: 7 | 30 | 90) => void;

  /* ---------- 内容概览 ---------- */
  overviews?: OverviewSection[];

  /* ---------- 统一控制面板扩展区 ---------- */
  /** 业务图表区（渲染于趋势图之后、内容概览之前） */
  businessCharts?: React.ReactNode;
  /** 系统可观测性区（渲染于快捷操作之后、页面底部） */
  systemSection?: React.ReactNode;

  /* ---------- 快捷操作 ---------- */
  quickActions?: QuickAction[];
}

/**
 * B 端工作台模板
 * - KPI 4 列网格
 * - 趋势图表 slot（P7 图表注入）
 * - 内容概览 3 列
 * - 快捷操作
 */
export function DashboardTemplate(props: DashboardTemplateProps) {
  const {
    status,
    onChartRetry,
    todoCount = 0,
    kpis = [],
    chart,
    onRangeChange,
    overviews = [],
    quickActions = [],
    businessCharts,
    systemSection,
  } = props;
  const user = useAuthStore((s) => s.user);

  const today = useMemo(() => {
    const d = new Date();
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekdays[d.getDay()]}`;
  }, []);

  const isLoading = status === "loading";
  const isEmpty = status === "empty";
  const isChartError = status === "chart-error";

  return (
    <div
      className="b-dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {/* 欢迎条 */}
      <div
        style={{
          paddingBottom: "var(--space-4)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "var(--font-size-h3, 20px)",
                fontWeight: 600,
                margin: 0,
                color: "var(--color-text-primary)",
              }}
            >
              你好，{user?.nickname ?? user?.username ?? "管理员"}
            </h2>
            <p
              style={{
                color: "var(--color-text-secondary)",
                margin: "var(--space-1) 0 0",
                fontSize: "var(--font-size-body, 14px)",
              }}
            >
              {today}
            </p>
          </div>
          {todoCount > 0 && (
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 600,
                  color: "var(--color-brand)",
                }}
              >
                {todoCount}
              </div>
              <div
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "var(--font-size-caption, 13px)",
                }}
              >
                待办事项
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI 网格 4 列 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--space-4)",
        }}
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          ))
        ) : isEmpty ? (
          <Card style={{ gridColumn: "span 4" }}>
            <Empty description="暂无统计数据" />
          </Card>
        ) : (
          kpis.map((kpi) => (
            <BStatisticCard
              key={kpi.key}
              title={kpi.title}
              value={kpi.value}
              prefix={kpi.prefix}
              suffix={kpi.suffix}
              trend={kpi.trend}
              trendText={kpi.trendText}
              trendLabel={kpi.trendLabel}
              sparkline={kpi.sparkline}
            />
          )))}
        </div>

      {/* 趋势图表 */}
      <Card
        title="数据趋势"
        extra={
          onRangeChange && (
            <div role="tablist" aria-label="时间范围">
              {([7, 30, 90] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onRangeChange(r)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: "var(--space-1) var(--space-2)",
                    color: "var(--color-brand)",
                    fontSize: "var(--font-size-body, 14px)",
                  }}
                >
                  {r} 天
                </button>
              ))}
            </div>
          )
        }
      >
        {isChartError ? (
          <Result
            status="warning"
            title="图表加载失败"
            subTitle="趋势数据加载出错，请重试。"
            extra={
              <Button icon={<ReloadOutlined />} onClick={onChartRetry}>
                重试
              </Button>
            }
          />
        ) : isLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          (chart ?? <Empty description="暂无趋势数据" />)
        )}
      </Card>

      {/* 业务图表区（统一控制面板扩展） */}
      {businessCharts && (
        <div className="b-dashboard__business-charts">{businessCharts}</div>
      )}

      {/* 内容概览 3 列 */}
      {overviews.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-4)",
          }}
        >
          {overviews.map((section) => (
            <Card key={section.key} title={section.title}>
              {section.items.length === 0 ? (
                <Empty description="暂无数据" />
              ) : (
                <List
                  size="small"
                  dataSource={section.items}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.title}
                        description={item.description}
                      />
                      {item.extra && (
                        <span
                          style={{
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--font-size-caption, 13px)",
                          }}
                        >
                          {item.extra}
                        </span>
                      )}
                    </List.Item>
                  )}
                />
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 快捷操作 */}
      {quickActions.length > 0 && (
        <Card title="快捷操作">
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}
          >
            {quickActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                className="b-dashboard__quick-btn"
              >
                {action.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* 系统可观测性区（统一控制面板扩展） */}
      {systemSection && (
        <div className="b-dashboard__system-section">{systemSection}</div>
      )}
    </div>
  );
}
