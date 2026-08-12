import { type ReactNode } from "react";
export interface CheckboxProps {
    checked: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
    children?: ReactNode;
    "aria-label"?: string;
}
export declare const Checkbox: import("react").ForwardRefExoticComponent<CheckboxProps & import("react").RefAttributes<HTMLLabelElement>>;
//# sourceMappingURL=Checkbox.d.ts.map