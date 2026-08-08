/* ============================================================
 * P2-3 · StatisticCard 统计卡片
 * title + value + prefix/suffix + trend up/down/flat + sparkline + loading + onClick
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
import { BSparkline } from "./BSparkline";

const { Text } = Typography;

export type StatisticTrend = "up" | "down" | "flat";

export interface BStatisticCardProps {
  title: string;
  value: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  trend?: StatisticTrend;
  trendText?: string;
  trendLabel?: string;
  sparkline?: number[];
  loading?: boolean;
  onClick?: () => void;
}

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
      sparkline,
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
            {sparkline && sparkline.length > 0 && (
              <BSparkline data={sparkline} height={24} dot={false} />
            )}
          </>
        )}
      </Card>
    );
  },
);