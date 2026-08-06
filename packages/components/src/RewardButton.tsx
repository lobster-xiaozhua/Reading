/* ============================================================
 * RewardButton · P6 §4
 * 打赏按钮：月票(rose-gradient)/推荐(rose 实色)/打赏(rose-gradient)
 * height 40px；hover 提亮+sh-2；active spring 缩放；粒子飞出
 * ============================================================ */

import { useState, type CSSProperties } from "react";
import { NovelThumbsUp, NovelReward } from "@novel/icons";

export type RewardType = "ticket" | "recommend" | "tip";

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

type Variant = "gradient" | "solid";

const REWARD_CONFIG: Record<RewardType, { label: string; variant: Variant }> = {
  ticket: { label: "投月票", variant: "gradient" },
  recommend: { label: "推荐", variant: "solid" },
  tip: { label: "打赏", variant: "gradient" },
};

const REWARD_ICON: Record<RewardType, typeof NovelReward> = {
  ticket: NovelReward,
  recommend: NovelThumbsUp,
  tip: NovelReward,
};

function RewardIconComp({ type }: { type: RewardType }) {
  const IconComp = REWARD_ICON[type];
  return <IconComp size="sm" aria-hidden="true" />;
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
    "novel-reward",
    `novel-reward--${rewardType}`,
    `novel-reward--${config.variant}`,
    exhausted ? "is-disabled" : "",
    loading ? "is-loading" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

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
        aria-label={`${config.label}${remaining != null ? `，今日剩余 ${remaining} 张` : ""}`}
      >
        <span className="novel-reward__icon" aria-hidden>
          {loading ? (
            <span className="novel-reward__spinner" aria-hidden />
          ) : (
            <RewardIconComp type={rewardType} />
          )}
        </span>
        <span className="novel-reward__label">
          {exhausted ? "今日已用完" : config.label}
        </span>
        {burst > 0 ? (
          <span key={burst} className="novel-reward__particles" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="novel-reward__particle"
                style={{ "--i": String(i) } as CSSProperties}
              />
            ))}
          </span>
        ) : null}
      </button>
      {remainingText ? (
        <div className="novel-reward__remaining">{remainingText}</div>
      ) : null}
    </div>
  );
}
