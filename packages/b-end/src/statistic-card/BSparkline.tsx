/* ============================================================
 * BSparkline · 迷你趋势图（Sparkline）
 * 纯 SVG 实现，零依赖，无布局抖动。
 * ============================================================ */

import { useId, type ReactNode } from "react";

export interface BSparklineProps {
  data: number[];
  height?: number;
  width?: string | number;
  area?: boolean;
  dot?: boolean;
  color?: string;
  showLastValue?: boolean;
  footer?: ReactNode;
}

function toPoints(
  data: number[],
  w: number,
  h: number,
  pad: number,
): Array<[number, number]> {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  return data.map((v, i) => {
    const x = pad + step * i;
    const y = pad + (h - pad * 2) * (1 - (v - min) / range);
    return [x, y] as [number, number];
  });
}

function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return "";
  const parts: string[] = [`M ${points[0]![0]} ${points[0]![1]}`];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!;
    const [x1, y1] = points[i]!;
    const mx = (x0 + x1) / 2;
    parts.push(`C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`);
  }
  return parts.join(" ");
}

export function BSparkline({
  data,
  height = 32,
  width = "100%",
  area = true,
  dot = true,
  color = "var(--color-brand)",
  showLastValue = false,
  footer,
}: BSparklineProps) {
  const gid = useId().replace(/:/g, "-");
  if (!data || data.length === 0) return null;

  const pad = 3;
  const w = typeof width === "number" ? width : 120;
  const pts: Array<[number, number]> = toPoints(data, w, height, pad);
  const line = smoothPath(pts);
  const last: [number, number] | null = pts.length > 0 ? pts[pts.length - 1]! : null;
  const first: [number, number] = pts[0]!;
  const lastValue: number = data.length > 0 ? data[data.length - 1]! : 0;

  const areaPath =
    area && last
      ? `${line} L ${last[0]} ${height - pad} L ${first[0]} ${height - pad} Z`
      : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "var(--space-2)",
        marginTop: "var(--space-2)",
      }}
    >
      <svg
        viewBox={`0 0 ${w} ${height}`}
        style={{
          width: width,
          height,
          display: "block",
          overflow: "visible",
        }}
        role="img"
        aria-label="趋势图"
      >
        <defs>
          <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill={`url(#spark-${gid})`} />}
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dot && last && (
          <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
        )}
      </svg>
      {(showLastValue || footer) && last && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {showLastValue && (
            <span
              style={{
                fontSize: "var(--font-size-caption, 13px)",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {lastValue}
            </span>
          )}
          {footer}
        </div>
      )}
    </div>
  );
}