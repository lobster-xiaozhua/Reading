/* ============================================================
 * Dropdown · 02 §1.9
 * 下拉菜单；items + danger + divider
 * ============================================================ */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Popper, type Placement } from './Popper.js';

export interface DropdownItem {
  key: string;
  label: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  items: DropdownItem[];
  trigger?: 'hover' | 'click';
  placement?: Placement;
  onClick?: (key: string) => void;
  children: ReactNode;
}

export function Dropdown({
  items,
  trigger = 'hover',
  placement = 'bottomStart',
  onClick,
  children,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (trigger !== 'click' || !open) return;
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
  }, [trigger, open]);

  const triggerHandlers =
    trigger === 'hover'
      ? {
          onMouseEnter: () => setOpen(true),
          onMouseLeave: () => setOpen(false),
        }
      : {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            setOpen((o) => !o);
          },
        };

  return (
    <div ref={containerRef} style={{ display: 'inline-flex' }}>
      <Popper
        open={open}
        placement={placement}
        offset={4}
        trigger={<span {...triggerHandlers} style={{ display: 'inline-flex' }}>{children}</span>}
      >
        {({ floatRef, floatStyle, ready }) => (
          <div
            ref={floatRef}
            className={`novel-dropdown__menu ${ready ? 'is-ready' : ''}`}
            style={floatStyle}
            role="menu"
          >
            {items.map((item) =>
              item.divider ? (
                <div key={item.key} className="novel-dropdown__divider" role="separator" />
              ) : (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  className={[
                    'novel-dropdown__item',
                    item.disabled ? 'is-disabled' : '',
                    item.danger ? 'is-danger' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    onClick?.(item.key);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ),
            )}
          </div>
        )}
      </Popper>
    </div>
  );
}
