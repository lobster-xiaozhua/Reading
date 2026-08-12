import type { ReactNode } from "react";
import type { ButtonProps } from "antd";
export interface BatchAction {
    /** 操作 key */
    key: string;
    /** 按钮文案 */
    label: string;
    /** 按钮类型 */
    type?: ButtonProps["type"];
    /** 是否危险操作（需二次确认） */
    danger?: boolean;
    /** 二次确认标题（danger=true 时必填） */
    confirmTitle?: string;
    /** 二次确认内容 */
    confirmContent?: ReactNode;
    /** 点击回调 */
    onClick: () => void;
    /** 是否禁用 */
    disabled?: boolean;
}
export interface BBatchActionBarProps {
    /** 已选数量 */
    selectedCount: number;
    /** 操作列表 */
    actions: BatchAction[];
    /** 是否显示 */
    visible: boolean;
    /** 清除选择回调 */
    onClear: () => void;
}
/**
 * B 端批量操作栏
 * - 选中行 > 0 时底部固定浮出
 * - 浮出动画 --dur-normal 240ms
 * - 阴影 --sh-4
 * - 危险操作二次确认
 */
export declare const BBatchActionBar: import("react").ForwardRefExoticComponent<BBatchActionBarProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=BBatchActionBar.d.ts.map