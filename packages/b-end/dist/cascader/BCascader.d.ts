import { type ComponentProps } from "react";
import { Cascader as AntCascader } from "antd";
export type BCascaderProps = ComponentProps<typeof AntCascader>;
/**
 * B 端级联选择。
 *
 * - 透传 AntD Cascader props
 * - 默认 changeOnSelect=true（允许选择任意层级，无需选到叶子）
 * - 默认 showSearch=true（支持搜索）
 *
 * 文档：建议层级 ≤ 3 级。
 */
export declare const BCascader: import("react").ForwardRefExoticComponent<(Omit<import("antd").CascaderProps<import("antd/es/cascader").DefaultOptionType, string, boolean> & {
    multiple?: false;
} & {
    children?: import("react").ReactNode | undefined;
} & import("react").RefAttributes<import("antd/es/cascader").CascaderRef>, "ref"> | Omit<import("antd").CascaderProps<import("antd/es/cascader").DefaultOptionType, string, true> & {
    multiple: true;
} & {
    children?: import("react").ReactNode | undefined;
} & import("react").RefAttributes<import("antd/es/cascader").CascaderRef>, "ref">) & import("react").RefAttributes<import("antd/es/cascader").CascaderRef>>;
//# sourceMappingURL=BCascader.d.ts.map