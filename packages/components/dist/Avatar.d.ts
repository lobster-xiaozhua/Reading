import { type ImgHTMLAttributes } from "react";
export type AvatarSize = "sm" | "md" | "lg";
export type AvatarShape = "circle" | "square";
export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
    src?: string;
    alt?: string;
    size?: AvatarSize;
    shape?: AvatarShape;
}
export declare function Avatar({ src, alt, size, shape, className, ...rest }: AvatarProps): import("react").JSX.Element;
//# sourceMappingURL=Avatar.d.ts.map