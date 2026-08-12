import { type SVGProps } from "react";
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
    /** 尺寸档位，默认 md（16px）。映射到 --icon-size-* 令牌 */
    size?: IconSize;
    /** 可访问性标签；提供则设 aria-label，否则 svg 设 aria-hidden */
    "aria-label"?: string;
}
/**
 * 图标基础组件。所有具体图标通过 children 传入 <path>/<circle> 等，
 * 描边/填充由本组件统一控制。
 */
export declare const Icon: import("react").NamedExoticComponent<IconProps>;
//# sourceMappingURL=Icon.d.ts.map