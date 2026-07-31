/* ============================================================
 * Radio · 02 §1.12
 * Radio.Group 单选组
 * ============================================================ */

import { forwardRef, type ReactNode } from 'react';

export interface RadioOption {
  label: ReactNode;
  value: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  vertical?: boolean;
  name?: string;
  'aria-label'?: string;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  { value, options, onChange, disabled = false, vertical = false, name, 'aria-label': ariaLabel },
  ref,
) {
  const groupName = name ?? `novel-radio-${Math.random().toString(36).slice(2)}`;
  const cls = ['novel-radio-group', vertical ? 'novel-radio-group--vertical' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={ref} className={cls} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const isChecked = value === opt.value;
        const isDisabled = disabled || opt.disabled;
        const itemCls = [
          'novel-radio',
          isChecked ? 'is-checked' : '',
          isDisabled ? 'is-disabled' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <label key={opt.value} className={itemCls}>
            <span className="novel-radio__box">
              <span className="novel-radio__dot" aria-hidden />
            </span>
            <input
              type="radio"
              className="novel-radio__input"
              name={groupName}
              checked={isChecked}
              disabled={isDisabled}
              onChange={() => !isDisabled && onChange(opt.value)}
            />
            <span className="novel-radio__label">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
});
