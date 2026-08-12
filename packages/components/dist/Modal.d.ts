import { type ReactNode } from "react";
export interface ModalProps {
    open: boolean;
    title?: ReactNode;
    width?: number | string;
    closable?: boolean;
    maskClosable?: boolean;
    onCancel?: () => void;
    footer?: ReactNode | null;
    children?: ReactNode;
}
export declare function Modal({ open, title, width, closable, maskClosable, onCancel, footer, children, }: ModalProps): import("react").ReactPortal | null;
//# sourceMappingURL=Modal.d.ts.map