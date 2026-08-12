import type { FormItemProps } from "antd";
export type BFormItemProps = FormItemProps;
/**
 * B 端表单项。
 *
 * - 透传 AntD Form.Item 全部 props
 * - required 默认显示红色星号（AntD 默认行为，由 Form 的 requiredMark 控制）
 *
 * 注：AntD Form.Item 未暴露 ref，BFormItem 通过外层 div 转发 ref 到根节点；
 * `layout='inline'` 场景若对额外包裹 div 敏感，可直接使用 AntD Form.Item。
 */
export declare const BFormItem: import("react").ForwardRefExoticComponent<BFormItemProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=BFormItem.d.ts.map