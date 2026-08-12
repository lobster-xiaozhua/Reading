import type { ReactNode } from "react";
export interface EmptyStateProps {
    title: string;
    description?: string;
    action?: ReactNode;
    /** 自定义插画，默认使用内置线框插画 */
    illustration?: ReactNode;
}
export declare function EmptyState({ title, description, action, illustration, }: EmptyStateProps): import("react").JSX.Element;
export interface SkeletonProps {
    rows?: number;
    avatar?: boolean;
    active?: boolean;
    loading?: boolean;
    children?: ReactNode;
}
export declare function Skeleton({ rows, avatar, active, loading, children, }: SkeletonProps): import("react").JSX.Element;
//# sourceMappingURL=EmptyState.d.ts.map