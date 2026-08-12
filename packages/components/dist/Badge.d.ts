import type { ReactNode } from "react";
export interface BadgeProps {
    /** 计数；与 dot 互斥。> overflow 显示 `${overflow}+` */
    count?: number;
    /** 溢出阈值，默认 99 */
    overflow?: number;
    /** 仅显示小红点（不显示数字） */
    dot?: boolean;
    children?: ReactNode;
}
export declare function Badge({ count, overflow, dot, children, }: BadgeProps): import("react").JSX.Element;
//# sourceMappingURL=Badge.d.ts.map