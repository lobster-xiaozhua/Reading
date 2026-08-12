import { type ReactNode } from "react";
import { type Placement } from "./Popper.js";
export interface TooltipProps {
    title: ReactNode;
    placement?: Placement;
    children: ReactNode;
}
export declare function Tooltip({ title, placement, children }: TooltipProps): import("react").JSX.Element;
//# sourceMappingURL=Tooltip.d.ts.map