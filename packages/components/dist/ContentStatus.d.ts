import type { ReactNode } from "react";
export type ContentStatusType = "ongoing" | "completed" | "paused" | "reviewing" | "offline";
export interface ContentStatusProps {
    status: ContentStatusType;
    size?: "sm" | "md";
    /** 是否显示前导圆点，默认 true */
    withDot?: boolean;
    /** 自定义文案；缺省取状态默认文案 */
    children?: ReactNode;
}
export declare function ContentStatus({ status, size, withDot, children, }: ContentStatusProps): import("react").JSX.Element;
//# sourceMappingURL=ContentStatus.d.ts.map