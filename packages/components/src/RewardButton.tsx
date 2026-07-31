/* ============================================================
 * RewardButton · P6 §4
 * 打赏按钮：月票(rose-gradient)/推荐(rose 实色)/打赏(rose-gradient)
 * height 40px；hover 提亮+sh-2；active spring 缩放；粒子飞出
 * ============================================================ */

import { useState, type CSSProperties } from 'react';

export type RewardType = 'ticket' | 'recommend' | 'tip';

export interface RewardButtonProps {
  rewardType: RewardType;
  /** 单次打赏数量，默认 1 */
  count?: number;
  /** 今日剩余次数；为 0 时展示「今日已用完」 */
  remaining?: number;
  onReward?: (type: RewardType, amount: number) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

type Variant = 'gradient' | 'solid';

const REWARD_CONFIG: Record<RewardType, { label: string; variant: Variant }> = {
  ticket: { label: '投月票', variant: 'gradient' },
  recommend: { label: '推荐', variant: 'solid' },
  tip: { label: '打赏', variant: 'gradient' },
};

function RewardIcon({ type }: { type: RewardType }) {
  if (type === 'ticket') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 14h4" />
      </svg>
    );
  }
  if (type === 'recommend') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 11v8H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h3z" />
        <path d="M7 11l4-7a2 2 0 0 1 3 1.5V9h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2-1.1 2-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2 2.5-.9 2.5-2" />
    </svg>
  );
}

export function RewardButton({
  rewardType,
  count = 1,
  remaining,
  onReward,
  disabled = false,
  loading = false,
  className,
}: RewardButtonProps) {
  const [burst, setBurst] = useState(0);
  const config = REWARD_CONFIG[rewardType];

  const exhausted = disabled || remaining === 0;
  const isDisabled = exhausted || loading;

  const cls = [
    'novel-reward',
    `novel-reward--${rewardType}`,
    `novel-reward--${config.variant}`,
    exhausted ? 'is-disabled' : '',
    loading ? 'is-loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (isDisabled) return;
    setBurst((b) => b + 1);
    onReward?.(rewardType, count);
  };

  const remainingText = remaining != null ? `今日剩余 ${remaining} 张` : null;

  return (
    <div className="novel-reward__wrap">
      <button
        type="button"
        className={cls}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={`${config.label}${remaining != null ? `，今日剩余 ${remaining} 张` : ''}`}
      >
        <span className="novel-reward__icon" aria-hidden>
          {loading ? (
            <span className="novel-reward__spinner" aria-hidden />
          ) : (
            <RewardIcon type={rewardType} />
          )}
        </span>
        <span className="novel-reward__label">{exhausted ? '今日已用完' : config.label}</span>
        {burst > 0 ? (
          <span key={burst} className="novel-reward__particles" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="novel-reward__particle"
                style={{ '--i': String(i) } as CSSProperties}
              />
            ))}
          </span>
        ) : null}
      </button>
      {remainingText ? <div className="novel-reward__remaining">{remainingText}</div> : null}
    </div>
  );
}
