/* ============================================================
 * Input · 02 §1.2
 * 受控单行输入；3 尺寸；3 校验态；prefix/suffix 容器
 * ============================================================ */

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export type InputSize = "sm" | "md" | "lg";
export type InputStatus = "default" | "error" | "warning";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "size" | "prefix"
> {
  size?: InputSize;
  status?: InputStatus;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  onChange?: (
    value: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = "md",
    status = "default",
    disabled = false,
    prefix,
    suffix,
    className,
    onChange,
    ...rest
  },
  ref,
) {
  const cls = [
    "novel-input",
    `novel-input--${size}`,
    status !== "default" ? `novel-input--${status}` : "",
    disabled ? "is-disabled" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const ariaInvalid = status === "error" ? true : undefined;

  return (
    <div className={cls} aria-disabled={disabled}>
      {prefix ? <span className="novel-input__prefix">{prefix}</span> : null}
      <input
        ref={ref}
        className="novel-input__input"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        onChange={(e) => onChange?.(e.target.value, e)}
        {...rest}
      />
      {suffix ? <span className="novel-input__suffix">{suffix}</span> : null}
    </div>
  );
});
