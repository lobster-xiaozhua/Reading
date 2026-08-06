/* ============================================================
 * P2-3 · StatisticCard 统计卡片
 * title + value + prefix/suffix + trend up/down/flat + loading + onClick
 * Source: 04 §6.3
 * ============================================================ */

import { forwardRef } from "react";
import type { ReactNode } from "react";
import { Card, Skeleton, Typography } from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export type StatisticTrend = "up" | "down" | "flat";

export interface BStatisticCardProps {
  /** 指标标题 */
  title: string;
  /** 主数值 */
  value: ReactNode;
  /** 数值前缀（如 ¥、$） */
  prefix?: ReactNode;
  /** 数值后缀（如 %、万） */
  suffix?: ReactNode;
  /** 趋势方向 */
  trend?: StatisticTrend;
  /** 趋势百分比文本（如 +12.5%） */
  trendText?: string;
  /** 趋势描述（如 "较昨日"） */
  trendLabel?: string;
  /** 加载态 */
  loading?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

/** 趋势色映射 */
function getTrendColor(trend: StatisticTrend): string {
  switch (trend) {
    case "up":
      return "var(--color-feedback-success)";
    case "down":
      return "var(--color-feedback-error)";
    case "flat":
    default:
      return "var(--color-text-tertiary)";
  }
}

function getTrendIcon(trend: StatisticTrend) {
  switch (trend) {
    case "up":
      return <ArrowUpOutlined />;
    case "down":
      return <ArrowDownOutlined />;
    case "flat":
    default:
      return <MinusOutlined />;
  }
}

/**
 * B 端统计卡片
 * - 工作台 KPI 指标展示
 * - 趋势色：up=success / down=error / flat=tertiary
 * - loading 时用 Skeleton 占位
 */
export const BStatisticCard = forwardRef<HTMLDivElement, BStatisticCardProps>(
  function BStatisticCard(
    {
      title,
      value,
      prefix,
      suffix,
      trend,
      trendText,
      trendLabel,
      loading,
      onClick,
    },
    ref,
  ) {
    return (
      <Card
        ref={ref}
        hoverable={Boolean(onClick)}
        onClick={onClick}
        className="b-statistic-card"
        styles={{ body: { padding: "var(--space-5)" } }}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <>
            <Text
              type="secondary"
              style={{ fontSize: "var(--font-size-caption, 13px)" }}
            >
              {title}
            </Text>
            <div
              className="b-statistic-card__value"
              style={{
                fontSize: 30,
                fontWeight: 600,
                lineHeight: 1.35,
                marginTop: "var(--space-2)",
                color: "var(--color-text-primary)",
              }}
            >
              {prefix && <span style={{ marginRight: 4 }}>{prefix}</span>}
              {value}
              {suffix && (
                <span
                  style={{
                    marginLeft: 4,
                    fontSize: "var(--font-size-body, 14px)",
                  }}
                >
                  {suffix}
                </span>
              )}
            </div>
            {trend && (
              <div
                className="b-statistic-card__trend"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  marginTop: "var(--space-2)",
                  fontSize: "var(--font-size-caption, 13px)",
                }}
              >
                <span
                  style={{
                    color: getTrendColor(trend),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  {getTrendIcon(trend)}
                  {trendText}
                </span>
                {trendLabel && (
                  <Text style={{ color: "var(--color-text-tertiary)" }}>
                    {trendLabel}
                  </Text>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    );
  },
);
