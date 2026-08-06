/* ============================================================
 * Tag · 02 §1.7
 * 5 语义色；可选关闭
 * ============================================================ */

import { forwardRef, type HTMLAttributes, type MouseEvent } from "react";

export type TagColor = "default" | "success" | "warning" | "error" | "primary";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  color?: TagColor;
  closable?: boolean;
  onClose?: (e: MouseEvent<SVGSVGElement>) => void;
  children?: React.ReactNode;
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  {
    color = "default",
    closable = false,
    onClose,
    className,
    children,
    ...rest
  },
  ref,
) {
  const cls = ["novel-tag", `novel-tag--${color}`, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span ref={ref} className={cls} {...rest}>
      {children}
      {closable ? (
        <svg
          className="novel-tag__close"
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-label="关闭"
          role="button"
          tabIndex={0}
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClose?.(e as unknown as MouseEvent<SVGSVGElement>);
            }
          }}
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      ) : null}
    </span>
  );
});
