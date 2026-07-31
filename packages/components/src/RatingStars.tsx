/* ============================================================
 * RatingStars · 03 §6.4
 * 星级评分：半星裁剪 / 只读 / 可交互 / 评分分布柱状图
 * 星星 24×24 网格 1.8px 描边 currentColor；半星通过图层裁剪实现
 * ============================================================ */

import { useRef, useState, type MouseEvent } from 'react';

export type RatingStarsSize = 'sm' | 'md' | 'lg';

/** 评分分布：索引 0 对应 1 星 … 索引 4 对应 5 星 */
export type RatingDistribution = [number, number, number, number, number];

export interface RatingStarsProps {
  /** 当前评分 0-5 */
  value: number;
  /** 最大星数，默认 5 */
  max?: number;
  /** 允许半星，默认 true */
  allowHalf?: boolean;
  /** 只读模式，默认 false */
  readonly?: boolean;
  /** 禁用：全部灰显且不可交互 */
  disabled?: boolean;
  /** 星星尺寸，默认 md */
  size?: RatingStarsSize;
  /** 是否显示数字（无障碍双重表达） */
  showValue?: boolean;
  /** 评分分布数据，提供时渲染 5 档柱状图 */
  distribution?: RatingDistribution;
  /** 评分回调（仅可交互模式） */
  onChange?: (value: number) => void;
  className?: string;
}

/** 单颗星 SVG（填充态由父级 currentColor + fill 控制） */
function StarShape() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2.5l2.9 5.87 6.48.94-4.69 4.57 1.11 6.45L12 17.9l-5.8 3.05 1.1-6.45-4.68-4.57 6.48-.94L12 2.5z" />
    </svg>
  );
}

/** 把 value 量化到允许的刻度（半星 0.5 / 整星 1） */
function quantize(v: number, allowHalf: boolean): number {
  if (allowHalf) return Math.round(v * 2) / 2;
  return Math.round(v);
}

export function RatingStars({
  value,
  max = 5,
  allowHalf = true,
  readonly = false,
  disabled = false,
  size = 'md',
  showValue = false,
  distribution,
  onChange,
  className,
}: RatingStarsProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const interactive = !readonly && !disabled && typeof onChange === 'function';
  const clamped = Math.max(0, Math.min(max, value));
  const display = hover ?? clamped;
  const fillPct = (display / max) * 100;

  /** 依据鼠标位置计算 hover 值（支持半星） */
  const computeHover = (e: MouseEvent<HTMLDivElement>): number => {
    const track = trackRef.current;
    if (!track) return clamped;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const starW = rect.width / max;
    const idx = x / starW; // 0..max
    const raw = allowHalf ? Math.floor(idx * 2 + 1) / 2 : Math.floor(idx) + 1;
    return Math.max(0, Math.min(max, raw));
  };

  const onMouseMove = interactive
    ? (e: MouseEvent<HTMLDivElement>) => setHover(computeHover(e))
    : undefined;
  const onMouseLeave = interactive ? () => setHover(null) : undefined;
  const onClick = interactive
    ? (e: MouseEvent<HTMLDivElement>) => {
        const v = computeHover(e);
        onChange?.(quantize(v, allowHalf));
      }
    : undefined;

  const stars = Array.from({ length: max }, (_, i) => i);

  const rootCls = [
    'novel-rating',
    `novel-rating--${size}`,
    interactive ? 'is-interactive' : '',
    disabled ? 'is-disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const label = disabled
    ? '评分（不可用）'
    : readonly
      ? `评分 ${clamped} 星`
      : undefined;

  return (
    <div className="novel-rating__wrap" role="img" aria-label={label}>
      <div
        ref={trackRef}
        className={rootCls}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        role={interactive ? 'slider' : undefined}
        aria-valuenow={interactive ? clamped : undefined}
        aria-valuemin={interactive ? 0 : undefined}
        aria-valuemax={interactive ? max : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                let next = clamped;
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clamped + (allowHalf ? 0.5 : 1);
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clamped - (allowHalf ? 0.5 : 1);
                else if (e.key === 'Home') next = 0;
                else if (e.key === 'End') next = max;
                else return;
                e.preventDefault();
                const q = Math.max(0, Math.min(max, quantize(next, allowHalf)));
                onChange?.(q);
              }
            : undefined
        }
      >
        {/* 空星层（描边灰） */}
        <div className="novel-rating__layer novel-rating__layer--empty" aria-hidden>
          {stars.map((i) => (
            <span key={i} className="novel-rating__star">
              <StarShape />
            </span>
          ))}
        </div>
        {/* 实星层（按百分比裁剪） */}
        <div
          className="novel-rating__layer novel-rating__layer--filled"
          style={{ width: `${fillPct}%` }}
          aria-hidden
        >
          {stars.map((i) => (
            <span key={i} className="novel-rating__star">
              <StarShape />
            </span>
          ))}
        </div>
      </div>

      {showValue ? (
        <span className="novel-rating__value">{clamped.toFixed(1)}</span>
      ) : null}

      {distribution ? <RatingDistribution distribution={distribution} /> : null}
    </div>
  );
}

/* ---------- 评分分布柱状图 ---------- */

function RatingDistribution({ distribution }: { distribution: RatingDistribution }) {
  // distribution[0]=1星 … distribution[4]=5星，渲染时由高到低
  const rows = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: distribution[star - 1] ?? 0,
  }));
  const total = rows.reduce((s, r) => s + r.count, 0);
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="novel-rating__dist" role="table" aria-label="评分分布">
      {rows.map((r) => {
        const pct = total === 0 ? 0 : (r.count / maxCount) * 100;
        return (
          <div key={r.star} className="novel-rating__dist-row" role="row">
            <span className="novel-rating__dist-label" role="rowheader">
              {r.star} 星
            </span>
            <span className="novel-rating__dist-track" role="cell">
              <span
                className="novel-rating__dist-bar"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="novel-rating__dist-count" role="cell">
              {r.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
