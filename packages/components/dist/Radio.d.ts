import { type ReactNode } from "react";
export interface RadioOption {
    label: ReactNode;
    value: string;
    disabled?: boolean;
}
export interface RadioGroupProps {
    value: string;
    options: RadioOption[];
    onChange: (value: string) => void;
    disabled?: boolean;
    vertical?: boolean;
    name?: string;
    "aria-label"?: string;
}
export declare const RadioGroup: import("react").ForwardRefExoticComponent<RadioGroupProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=Radio.d.ts.map