/* ============================================================
 * Tooltip · 02 §1.8
 * 纯文本提示；hover/focus 触发；dur-fast 渐显
 * ============================================================ */

import { useState, type ReactNode } from "react";
import { Popper, type Placement } from "./Popper.js";

export interface TooltipProps {
  title: ReactNode;
  placement?: Placement;
  children: ReactNode;
}

export function Tooltip({ title, placement = "top", children }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popper
      open={open}
      placement={placement}
      offset={6}
      trigger={
        <span
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          style={{ display: "inline-flex" }}
        >
          {children}
        </span>
      }
    >
      {({ floatRef, floatStyle, ready }) => (
        <div
          ref={floatRef}
          className={`novel-tooltip ${placement.startsWith("bottom") ? "novel-tooltip--bottom" : ""} ${ready ? "is-ready" : ""}`}
          style={floatStyle}
          role="tooltip"
        >
          {title}
        </div>
      )}
    </Popper>
  );
}
