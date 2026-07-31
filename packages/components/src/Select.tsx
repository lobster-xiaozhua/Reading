/* ============================================================
 * Select · 02 §1.3
 * 单选 / 多选 / 搜索；键盘导航；远程 loading
 * 复用 Popper 的定位逻辑
 * ============================================================ */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Popper } from './Popper.js';

export interface SelectOption {
  label: ReactNode;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string | string[];
  options: SelectOption[];
  multiple?: boolean;
  searchable?: boolean;
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (val: string | string[]) => void;
  /** 自定义渲染选中项标签（多选场景） */
  renderTag?: (opt: SelectOption) => ReactNode;
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-standard)' }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4 4 10-10" />
  </svg>
);

const Spin = () => (
  <span className="novel-select__spin" aria-hidden />
);

export function Select({
  value,
  options,
  multiple = false,
  searchable = false,
  loading = false,
  placeholder = '请选择',
  disabled = false,
  size = 'md',
  onChange,
  renderTag,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const keywordRef = useRef<HTMLInputElement | null>(null);

  // 受控值统一为数组形式做内部处理
  const selectedArr = useMemo<string[]>(() => {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }, [value]);

  const optionMap = useMemo(() => {
    const m = new Map<string, SelectOption>();
    options.forEach((o) => m.set(o.value, o));
    return m;
  }, [options]);

  const filtered = useMemo(() => {
    if (!searchable || !keyword.trim()) return options;
    const kw = keyword.trim().toLowerCase();
    return options.filter((o) => {
      const label = typeof o.label === 'string' ? o.label : String(o.value);
      return label.toLowerCase().includes(kw);
    });
  }, [options, keyword, searchable]);

  // 外部点击 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // 展开时聚焦搜索框
  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => keywordRef.current?.focus());
    } else if (!open) {
      setKeyword('');
    }
  }, [open, searchable]);

  const isSelected = (v: string) => selectedArr.includes(v);

  const toggle = (v: string) => {
    if (multiple) {
      const next = isSelected(v)
        ? selectedArr.filter((x) => x !== v)
        : [...selectedArr, v];
      onChange?.(next);
    } else {
      onChange?.(v);
      setOpen(false);
    }
  };

  // 渲染选择器表面
  const renderSurface = () => {
    if (multiple) {
      if (selectedArr.length === 0) {
        return <span className="novel-select__placeholder">{placeholder}</span>;
      }
      return (
        <span className="novel-select__tags">
          {selectedArr.map((v) => {
            const opt = optionMap.get(v);
            if (!opt) return null;
            return (
              <span key={v} className="novel-select__tag">
                {renderTag ? renderTag(opt) : opt.label}
                <button
                  type="button"
                  className="novel-select__tag-close"
                  aria-label={`移除 ${opt.value}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(v);
                  }}
                >
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </span>
            );
          })}
        </span>
      );
    }
    // 单选
    if (selectedArr.length === 0) {
      return <span className="novel-select__placeholder">{placeholder}</span>;
    }
    const opt = optionMap.get(selectedArr[0]);
    return <span className="novel-select__value">{opt?.label ?? selectedArr[0]}</span>;
  };

  return (
    <div ref={containerRef} className={`novel-select novel-select--${size} ${disabled ? 'is-disabled' : ''} ${open ? 'is-open' : ''}`}>
      <Popper
        open={open}
        placement="bottomStart"
        offset={4}
        trigger={
          <button
            type="button"
            className="novel-select__selector"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => !disabled && setOpen((o) => !o)}
          >
            <span className="novel-select__surface">{renderSurface()}</span>
            <span className="novel-select__suffix">
              {loading ? <Spin /> : <Chevron open={open} />}
            </span>
          </button>
        }
      >
        {({ floatRef, floatStyle, ready }) => (
          <div
            ref={floatRef}
            className={`novel-select__dropdown ${ready ? 'is-ready' : ''}`}
            style={floatStyle}
            role="listbox"
          >
            {searchable ? (
              <div className="novel-select__search">
                <input
                  ref={keywordRef}
                  type="text"
                  className="novel-select__search-input"
                  value={keyword}
                  placeholder="搜索"
                  onChange={(e) => setKeyword(e.target.value)}
                  aria-label="搜索选项"
                />
              </div>
            ) : null}
            <div className="novel-select__options">
              {loading ? (
                <div className="novel-select__loading">加载中…</div>
              ) : filtered.length === 0 ? (
                <div className="novel-select__empty">无匹配项</div>
              ) : (
                filtered.map((opt) => {
                  const selected = isSelected(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={[
                        'novel-select__option',
                        selected ? 'is-selected' : '',
                        opt.disabled ? 'is-disabled' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={opt.disabled}
                      onClick={() => !opt.disabled && toggle(opt.value)}
                    >
                      <span className="novel-select__option-label">{opt.label}</span>
                      {selected ? (
                        <span className="novel-select__option-check">
                          <Check />
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Popper>
    </div>
  );
}
