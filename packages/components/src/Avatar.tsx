/* ============================================================
 * Avatar · 02 §1.10
 * 图片 / 首字兜底；3 尺寸；2 形状
 * ============================================================ */

import { useState, type ImgHTMLAttributes } from "react";

export type AvatarSize = "sm" | "md" | "lg";
export type AvatarShape = "circle" | "square";

export interface AvatarProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt"
> {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
}

export function Avatar({
  src,
  alt = "",
  size = "md",
  shape = "circle",
  className,
  ...rest
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const cls = [
    "novel-avatar",
    `novel-avatar--${size}`,
    `novel-avatar--${shape}`,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  // 首字兜底：取 alt 第一个字符（中文/英文皆可）
  const initial = alt.trim().charAt(0) || "?";

  return (
    <span className={cls} role="img" aria-label={alt || "头像"}>
      {src && !failed ? (
        <img
          className="novel-avatar__img"
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          {...rest}
        />
      ) : (
        <span aria-hidden>{initial.toUpperCase()}</span>
      )}
    </span>
  );
}
