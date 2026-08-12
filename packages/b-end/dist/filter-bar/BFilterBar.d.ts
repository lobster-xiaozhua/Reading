import type { ReactNode } from "react";
export interface FilterField {
    /** 字段 key */
    name: string;
    /** 字段标签 */
    label: string;
    /** 渲染控件（Form.Item 内） */
    control: ReactNode;
}
export interface BFilterBarProps {
    /** 搜索关键词（受控） */
    searchKey?: string;
    /** 搜索回调 */
    onSearch?: (value: string) => void;
    /** 搜索框 placeholder */
    searchPlaceholder?: string;
    /** 常规筛选字段（始终显示） */
    filters?: FilterField[];
    /** 高级筛选字段（Drawer 内显示） */
    advancedFilters?: FilterField[];
    /** 高级筛选初始值 */
    advancedValues?: Record<string, unknown>;
    /** 高级筛选确认回调 */
    onAdvancedConfirm?: (values: Record<string, unknown>) => void;
    /** 重置回调 */
    onReset?: () => void;
    /** 右侧额外操作 */
    extra?: ReactNode;
    /** 是否可折叠（filters 多时） */
    collapsible?: boolean;
    /** 默认展开折叠项 */
    defaultExpanded?: boolean;
}
/**
 * B 端筛选栏
 * - 左侧搜索 + 常规筛选
 * - 右侧高级筛选 Drawer + 重置 + 额外操作
 * - 有筛选条件时高级筛选按钮高亮（Badge 红点）
 */
export declare const BFilterBar: import("react").ForwardRefExoticComponent<BFilterBarProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=BFilterBar.d.ts.map