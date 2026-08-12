import type { ComponentProps } from "react";
import { Breadcrumb } from "antd";
export interface BBreadcrumbItem {
    /** 显示文案 */
    title: string;
    /** 点击跳转路径或回调；不填则当前页（不可点击） */
    href?: string;
    onClick?: () => void;
}
export interface BBreadcrumbProps extends Omit<ComponentProps<typeof Breadcrumb>, "items"> {
    items: BBreadcrumbItem[];
}
/**
 * B 端面包屑
 * - 可点击项用品牌色
 * - 当前页（无 href/onClick）用主文本色，不可点击
 */
export declare const BBreadcrumb: import("react").ForwardRefExoticComponent<BBreadcrumbProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=BBreadcrumb.d.ts.map