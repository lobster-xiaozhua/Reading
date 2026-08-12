import { type ReactNode } from "react";
import { type Placement } from "./Popper.js";
export interface DropdownItem {
    key: string;
    label: ReactNode;
    disabled?: boolean;
    danger?: boolean;
    divider?: boolean;
}
export interface DropdownProps {
    items: DropdownItem[];
    trigger?: "hover" | "click";
    placement?: Placement;
    onClick?: (key: string) => void;
    children: ReactNode;
}
export declare function Dropdown({ items, trigger, placement, onClick, children, }: DropdownProps): import("react").JSX.Element;
//# sourceMappingURL=Dropdown.d.ts.map