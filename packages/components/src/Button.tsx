/* ============================================================
 * Button · 02 §1.1
 * 5 变体 × 3 尺寸；令牌消费；focus-visible + loading
 * ============================================================ */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  /** 指定 type，默认 'button'，避免表单误提交 */
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const cls = [
    'novel-btn',
    `novel-btn--${variant}`,
    `novel-btn--${size}`,
    loading ? 'is-loading' : '',
    isDisabled ? 'is-disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type={type} className={cls} disabled={isDisabled} aria-busy={loading} {...rest}>
      {loading ? <span className="novel-btn__spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
