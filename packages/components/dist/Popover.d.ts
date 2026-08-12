import { type ReactNode } from "react";
import { type Placement } from "./Popper.js";
export interface PopoverProps {
    title?: ReactNode;
    content: ReactNode;
    trigger?: "hover" | "click";
    placement?: Placement;
    children: ReactNode;
}
export declare function Popover({ title, content, trigger, placement, children, }: PopoverProps): import("react").JSX.Element;
//# sourceMappingURL=Popover.d.ts.map