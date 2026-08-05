/* ============================================================
 * NotificationBadge · 03 §6.12
 * 追更通知：未读 rose 红点 / 已读 / hover 忽略 / 多条合并聚合卡
 * ============================================================ */

import { NavigationClose } from '@novel/icons';

export interface NotificationBadgeProps {
  /** 小说标题（单条模式必填） */
  novelTitle?: string;
  /** 新增章节数 */
  chapterCount?: number;
  /** 更新时间 */
  updateTime?: number | Date;
  /** 是否已读，默认 false（未读） */
  read?: boolean;
  /** 聚合条数：>0 时渲染「N 本书有更新」聚合卡片 */
  aggregateCount?: number;
  /** 点击整卡跳转最新章节 */
  onClick?: () => void;
  /** 忽略（标记已读） */
  onDismiss?: () => void;
  className?: string;
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 日期 */
function formatRelative(input: number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function NotificationBadge({
  novelTitle,
  chapterCount,
  updateTime,
  read = false,
  aggregateCount,
  onClick,
  onDismiss,
  className,
}: NotificationBadgeProps) {
  const rootCls = [
    'novel-notify',
    read ? 'is-read' : 'is-unread',
    onClick ? 'is-clickable' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  /* ---------- 聚合卡片（多条合并） ---------- */
  if (aggregateCount != null && aggregateCount > 0) {
    return (
      <div
        className={`${rootCls} novel-notify--aggregate`}
        role="button"
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label={`${aggregateCount} 本书有更新`}
      >
        <span className="novel-notify__dot" aria-hidden />
        <span className="novel-notify__aggregate-text">
          {aggregateCount} 本书有更新
        </span>
        <span className="novel-notify__chevron" aria-hidden>›</span>
      </div>
    );
  }

  /* ---------- 单条通知 ---------- */
  const timeText = updateTime != null ? formatRelative(updateTime) : '';

  return (
    <div
      className={rootCls}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={read ? `${novelTitle} 更新 ${chapterCount} 章` : `${novelTitle} 更新 ${chapterCount} 章，未读`}
    >
      <span className="novel-notify__dot" aria-hidden />
      <div className="novel-notify__body">
        <div className="novel-notify__title-row">
          <span className="novel-notify__title">{novelTitle}</span>
          {chapterCount != null ? (
            <span className="novel-notify__count">更新 {chapterCount} 章</span>
          ) : null}
        </div>
        {timeText ? <span className="novel-notify__time">{timeText}</span> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="novel-notify__dismiss"
          aria-label="忽略此通知"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <NavigationClose size="sm" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
