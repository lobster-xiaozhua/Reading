export type RatingStarsSize = "sm" | "md" | "lg";
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
export declare function RatingStars({ value, max, allowHalf, readonly, disabled, size, showValue, distribution, onChange, className, }: RatingStarsProps): import("react").JSX.Element;
//# sourceMappingURL=RatingStars.d.ts.map