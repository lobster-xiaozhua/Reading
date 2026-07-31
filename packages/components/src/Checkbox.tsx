/* ============================================================
 * Checkbox · 02 §1.12
 * 多选 + indeterminate 半选
 * ============================================================ */

import { forwardRef, type ReactNode, type MouseEvent } from 'react';

export interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  children?: ReactNode;
  'aria-label'?: string;
}

export const Checkbox = forwardRef<HTMLLabelElement, CheckboxProps>(function Checkbox(
  { checked, indeterminate = false, disabled = false, onChange, children, 'aria-label': ariaLabel },
  ref,
) {
  const cls = [
    'novel-checkbox',
    checked ? 'is-checked' : '',
    indeterminate ? 'is-indeterminate' : '',
    disabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const toggle = () => {
    if (disabled) return;
    onChange?.(!checked);
  };

  return (
    <label
      ref={ref}
      className={cls}
      aria-label={ariaLabel}
      onClick={(e: MouseEvent<HTMLLabelElement>) => {
        // 防止 label 内嵌 input 的默认行为导致双触发
        if (disabled) e.preventDefault();
      }}
    >
      <span className="novel-checkbox__box">
        {indeterminate ? (
          <span className="novel-checkbox__indeterminate" aria-hidden />
        ) : (
          <svg
            className="novel-checkbox__check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        className="novel-checkbox__input"
        checked={checked}
        disabled={disabled}
        aria-checked={indeterminate ? 'mixed' : checked}
        onChange={toggle}
      />
      {children != null ? <span className="novel-checkbox__label">{children}</span> : null}
    </label>
  );
});
