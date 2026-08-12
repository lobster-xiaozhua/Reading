export type SwitchSize = "sm" | "md";
export interface SwitchProps {
    checked: boolean;
    disabled?: boolean;
    size?: SwitchSize;
    onChange?: (checked: boolean) => void;
    "aria-label"?: string;
}
export declare const Switch: import("react").ForwardRefExoticComponent<SwitchProps & import("react").RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=Switch.d.ts.map