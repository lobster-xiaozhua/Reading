import { type ReactNode } from "react";
export type DrawerPlacement = "left" | "right";
export interface DrawerProps {
    open: boolean;
    title?: ReactNode;
    placement?: DrawerPlacement;
    width?: number | string;
    closable?: boolean;
    maskClosable?: boolean;
    onClose?: () => void;
    footer?: ReactNode | null;
    children?: ReactNode;
}
export declare function Drawer({ open, title, placement, width, closable, maskClosable, onClose, footer, children, }: DrawerProps): import("react").ReactPortal | null;
//# sourceMappingURL=Drawer.d.ts.map