import type { ReactNode } from "react";
export interface StatCardProps {
    /** 统计数值 */
    value: ReactNode;
    /** 统计标签 */
    label: string;
    /** 自定义 className */
    className?: string;
    /** 是否使用等宽字体显示数值（适合数字） */
    mono?: boolean;
}
export declare function StatCard({ value, label, className, mono, }: StatCardProps): import("react").JSX.Element;
//# sourceMappingURL=StatCard.d.ts.map