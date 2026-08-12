import type { ReactNode } from "react";
import type { BBreadcrumbProps } from "../breadcrumb/BBreadcrumb.js";
export interface BPageHeaderProps {
    /** 页面标题（H2 28px） */
    title: string;
    /** 面包屑配置 */
    breadcrumb?: BBreadcrumbProps["items"];
    /** 标题右侧标签 */
    tags?: ReactNode;
    /** 标题右侧操作区 */
    extra?: ReactNode;
    /** 子标题/描述 */
    subTitle?: ReactNode;
    /** 返回按钮回调（不传则不显示返回按钮） */
    onBack?: () => void;
    /** 返回按钮文案，默认"返回" */
    backText?: string;
}
/**
 * B 端页面标题
 * - title 用 H2 (28px semibold)
 * - 可选面包屑、标签、操作按钮、返回
 */
export declare const BPageHeader: import("react").ForwardRefExoticComponent<BPageHeaderProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=BPageHeader.d.ts.map