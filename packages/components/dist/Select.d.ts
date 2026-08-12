import { type ReactNode } from "react";
export interface SelectOption {
    label: ReactNode;
    value: string;
    disabled?: boolean;
}
export interface SelectProps {
    value: string | string[];
    options: SelectOption[];
    multiple?: boolean;
    searchable?: boolean;
    loading?: boolean;
    placeholder?: string;
    disabled?: boolean;
    size?: "sm" | "md" | "lg";
    onChange?: (val: string | string[]) => void;
    /** 自定义渲染选中项标签（多选场景） */
    renderTag?: (opt: SelectOption) => ReactNode;
}
export declare function Select({ value, options, multiple, searchable, loading, placeholder, disabled, size, onChange, renderTag, }: SelectProps): import("react").JSX.Element;
//# sourceMappingURL=Select.d.ts.map