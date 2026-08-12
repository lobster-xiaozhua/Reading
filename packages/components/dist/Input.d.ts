import { type InputHTMLAttributes, type ReactNode } from "react";
export type InputSize = "sm" | "md" | "lg";
export type InputStatus = "default" | "error" | "warning";
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "size" | "prefix"> {
    size?: InputSize;
    status?: InputStatus;
    disabled?: boolean;
    prefix?: ReactNode;
    suffix?: ReactNode;
    onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
}
export declare const Input: import("react").ForwardRefExoticComponent<InputProps & import("react").RefAttributes<HTMLInputElement>>;
//# sourceMappingURL=Input.d.ts.map