/* ============================================================
 * Badge · 02 §1.7
 * 计数 / 小红点 / 溢出 99+
 * ============================================================ */

import type { ReactNode } from "react";

export interface BadgeProps {
  /** 计数；与 dot 互斥。> overflow 显示 `${overflow}+` */
  count?: number;
  /** 溢出阈值，默认 99 */
  overflow?: number;
  /** 仅显示小红点（不显示数字） */
  dot?: boolean;
  children?: ReactNode;
}

export function Badge({
  count,
  overflow = 99,
  dot = false,
  children,
}: BadgeProps) {
  let label: string | null = null;
  if (!dot && count != null) {
    label = count > overflow ? `${overflow}+` : String(count);
  }

  return (
    <span className="novel-badge">
      {children}
      {dot ? (
        <span className="novel-badge__dot" aria-label="有新内容" />
      ) : label != null ? (
        <span className="novel-badge__count" aria-label={`${label} 条未读`}>
          {label}
        </span>
      ) : null}
    </span>
  );
}
