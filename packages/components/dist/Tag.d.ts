import { type HTMLAttributes, type MouseEvent } from "react";
export type TagColor = "default" | "success" | "warning" | "error" | "primary";
export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
    color?: TagColor;
    closable?: boolean;
    onClose?: (e: MouseEvent<SVGSVGElement>) => void;
    children?: React.ReactNode;
}
export declare const Tag: import("react").ForwardRefExoticComponent<TagProps & import("react").RefAttributes<HTMLSpanElement>>;
//# sourceMappingURL=Tag.d.ts.map