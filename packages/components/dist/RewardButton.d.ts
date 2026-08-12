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
export declare function RewardButton({ rewardType, count, remaining, onReward, disabled, loading, className, }: RewardButtonProps): import("react").JSX.Element;
//# sourceMappingURL=RewardButton.d.ts.map