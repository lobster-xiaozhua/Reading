/* ============================================================
 * Pagination · 02 §1.15
 * 省略号折叠；prev/next；快速跳转（可选）
 * ============================================================ */

import { useMemo, type ReactNode } from 'react';
import { NavigationChevronLeft, NavigationChevronRight } from '@novel/icons';

export interface PaginationProps {
  /** 当前页（1-based） */
  current: number;
  /** 总页数 */
  total: number;
  /** 折叠时两端保留的页数 */
  siblings?: number;
  /** 显示快速跳转输入框 */
  showJumper?: boolean;
  /** 显示总数文本 */
  showTotal?: boolean;
  /** 总条目数（仅用于 showTotal 文案） */
  totalItems?: number;
  onChange?: (page: number) => void;
}



/** 计算需要显示的页码：用 -1 表示省略号 */
function range(current: number, total: number, siblings: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const left = Math.max(1, current - siblings);
  const right = Math.min(total, current + siblings);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < total - 1;

  const pages: number[] = [1];
  if (showLeftEllipsis) pages.push(-1);
  for (let i = left; i <= right; i++) {
    if (i !== 1 && i !== total) pages.push(i);
  }
  if (showRightEllipsis) pages.push(-1);
  if (total !== 1) pages.push(total);
  return pages;
}

export function Pagination({
  current,
  total,
  siblings = 1,
  showJumper = false,
  showTotal = false,
  totalItems,
  onChange,
}: PaginationProps) {
  const pages = useMemo(() => range(current, total, siblings), [current, total, siblings]);

  const go = (p: number) => {
    if (p < 1 || p > total || p === current) return;
    onChange?.(p);
  };

  const renderItem = (p: number, key: string | number): ReactNode => {
    if (p === -1) {
      return (
        <li key={`ellipsis-${key}`} className="novel-pagination__item novel-pagination__ellipsis" aria-hidden>
          …
        </li>
      );
    }
    const isActive = p === current;
    return (
      <li key={p}>
        <button
          type="button"
          className={`novel-pagination__item ${isActive ? 'is-active' : ''}`}
          aria-current={isActive ? 'page' : undefined}
          aria-label={`第 ${p} 页`}
          onClick={() => go(p)}
        >
          {p}
        </button>
      </li>
    );
  };

  const prevDisabled = current <= 1;
  const nextDisabled = current >= total;

  return (
    <nav className="novel-pagination" aria-label="分页">
      {showTotal && totalItems != null ? (
        <span className="novel-pagination__total">共 {totalItems} 条</span>
      ) : null}
      <ul className="novel-pagination__list">
        <li>
          <button
            type="button"
            className="novel-pagination__item novel-pagination__nav"
            onClick={() => go(current - 1)}
            disabled={prevDisabled}
            aria-label="上一页"
          >
            <NavigationChevronLeft size="sm" aria-hidden="true" />
          </button>
        </li>
        {pages.map((p, i) => renderItem(p, i))}
        <li>
          <button
            type="button"
            className="novel-pagination__item novel-pagination__nav"
            onClick={() => go(current + 1)}
            disabled={nextDisabled}
            aria-label="下一页"
          >
            <NavigationChevronRight size="sm" aria-hidden="true" />
          </button>
        </li>
      </ul>
      {showJumper && total > 1 ? (
        <span className="novel-pagination__jumper">
          跳至
          <input
            type="number"
            min={1}
            max={total}
            className="novel-pagination__jumper-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(v)) go(v);
              }
            }}
            aria-label="跳转到指定页"
          />
          页
        </span>
      ) : null}
    </nav>
  );
}
