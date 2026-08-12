import type { ReactNode } from "react";
export type StatisticTrend = "up" | "down" | "flat";
export interface BStatisticCardProps {
    title: string;
    value: ReactNode;
    prefix?: ReactNode;
    suffix?: ReactNode;
    trend?: StatisticTrend;
    trendText?: string;
    trendLabel?: string;
    sparkline?: number[];
    loading?: boolean;
    onClick?: () => void;
}
export declare const BStatisticCard: import("react").ForwardRefExoticComponent<BStatisticCardProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=BStatisticCard.d.ts.map