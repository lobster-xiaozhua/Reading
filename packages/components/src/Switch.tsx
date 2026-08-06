/* ============================================================
 * Switch · 02 §1.11
 * 二元开关；2 尺寸；brand 开启色
 * ============================================================ */

import { forwardRef } from "react";

export type SwitchSize = "sm" | "md";

export interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  size?: SwitchSize;
  onChange?: (checked: boolean) => void;
  "aria-label"?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch(
    {
      checked,
      disabled = false,
      size = "md",
      onChange,
      "aria-label": ariaLabel,
    },
    ref,
  ) {
    const cls = [
      "novel-switch",
      `novel-switch--${size}`,
      checked ? "is-checked" : "",
      disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        className={cls}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
      >
        <span className="novel-switch__thumb" aria-hidden />
      </button>
    );
  },
);
