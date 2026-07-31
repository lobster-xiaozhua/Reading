/* ============================================================
 * EmptyState / Skeleton · 02 §1.14
 * ============================================================ */

import type { ReactNode } from 'react';

/* ---------- EmptyState ---------- */

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** 自定义插画，默认使用内置线框插画 */
  illustration?: ReactNode;
}

const DefaultIllustration = () => (
  <svg viewBox="0 0 120 120" width="120" height="120" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="20" y="30" width="80" height="64" rx="4" />
    <path d="M30 50h40M30 62h50M30 74h30" />
    <circle cx="92" cy="48" r="14" strokeDasharray="3 3" />
  </svg>
);

export function EmptyState({ title, description, action, illustration }: EmptyStateProps) {
  return (
    <div className="novel-empty" role="status">
      <div className="novel-empty__illustration">
        {illustration ?? <DefaultIllustration />}
      </div>
      <div className="novel-empty__title">{title}</div>
      {description != null ? <div className="novel-empty__description">{description}</div> : null}
      {action != null ? <div className="novel-empty__actions">{action}</div> : null}
    </div>
  );
}

/* ---------- Skeleton ---------- */

export interface SkeletonProps {
  rows?: number;
  avatar?: boolean;
  active?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export function Skeleton({
  rows = 3,
  avatar = false,
  active = true,
  loading = true,
  children,
}: SkeletonProps) {
  if (!loading) return <>{children}</>;

  return (
    <div className={`novel-skeleton ${active ? 'is-active' : ''}`} role="status" aria-live="polite">
      <div className="novel-skeleton__row">
        {avatar ? <div className="novel-skeleton__avatar" /> : null}
        <div style={{ flex: 1 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="novel-skeleton__line" />
          ))}
        </div>
      </div>
    </div>
  );
}
