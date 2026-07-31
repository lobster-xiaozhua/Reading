/* ============================================================
 * ContentStatus · 02 §1.17
 * 内容生命周期状态标签：5 种固定枚举，颜色映射强约束
 * 与通用 Tag 的区别：状态集合固定、不可自定义色值
 * ============================================================ */

import type { ReactNode } from 'react';

export type ContentStatusType =
  | 'ongoing'
  | 'completed'
  | 'paused'
  | 'reviewing'
  | 'offline';

export interface ContentStatusProps {
  status: ContentStatusType;
  size?: 'sm' | 'md';
  /** 是否显示前导圆点，默认 true */
  withDot?: boolean;
  /** 自定义文案；缺省取状态默认文案 */
  children?: ReactNode;
}

const DEFAULT_LABEL: Record<ContentStatusType, string> = {
  ongoing: '连载中',
  completed: '已完结',
  paused: '暂停更新',
  reviewing: '审核中',
  offline: '已下架',
};

export function ContentStatus({
  status,
  size = 'md',
  withDot = true,
  children,
}: ContentStatusProps) {
  const label = children ?? DEFAULT_LABEL[status];
  return (
    <span
      className={`novel-content-status novel-content-status--${status} novel-content-status--${size}`}
      role="status"
    >
      {withDot ? <span className="novel-content-status__dot" aria-hidden /> : null}
      <span className="novel-content-status__label">{label}</span>
    </span>
  );
}
