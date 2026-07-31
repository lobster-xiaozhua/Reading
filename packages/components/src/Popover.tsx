/* ============================================================
 * Popover · 02 §1.8
 * 富内容；hover/click 触发
 * ============================================================ */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Popper, type Placement } from './Popper.js';

export interface PopoverProps {
  title?: ReactNode;
  content: ReactNode;
  trigger?: 'hover' | 'click';
  placement?: Placement;
  children: ReactNode;
}

export function Popover({
  title,
  content,
  trigger = 'hover',
  placement = 'top',
  children,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // click 模式下点击外部关闭
  useEffect(() => {
    if (trigger !== 'click' || !open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
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
        offset={8}
        trigger={<span {...triggerHandlers} style={{ display: 'inline-flex' }}>{children}</span>}
      >
        {({ floatRef, floatStyle, ready }) => (
          <div
            ref={floatRef}
            className={`novel-popover ${placement.startsWith('bottom') ? 'novel-popover--bottom' : ''} ${ready ? 'is-ready' : ''}`}
            style={floatStyle}
            role="dialog"
          >
            {title != null ? <div className="novel-popover__header">{title}</div> : null}
            <div className="novel-popover__body">{content}</div>
          </div>
        )}
      </Popper>
    </div>
  );
}
