/* ============================================================
 * StatCard · 统计卡片组件
 * 用于展示评分、收藏、点击等关键指标
 * ============================================================ */

import type { ReactNode } from "react";

export interface StatCardProps {
  /** 统计数值 */
  value: ReactNode;
  /** 统计标签 */
  label: string;
  /** 自定义 className */
  className?: string;
  /** 是否使用等宽字体显示数值（适合数字） */
  mono?: boolean;
}

export function StatCard({
  value,
  label,
  className = "",
  mono = true,
}: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <span className={`stat-card__value ${mono ? "stat-card__value--mono" : ""}`}>
        {value}
      </span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}
