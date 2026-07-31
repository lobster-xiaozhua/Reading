/* ============================================================
 * Drawer · 02 §1.5
 * 侧边抽屉：滑入动画、遮罩、Esc 关闭、内容滚动
 * 用于次级任务流 / 详情面板
 * ============================================================ */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type DrawerPlacement = 'left' | 'right';

export interface DrawerProps {
  open: boolean;
  title?: ReactNode;
  placement?: DrawerPlacement;
  width?: number | string;
  closable?: boolean;
  maskClosable?: boolean;
  onClose?: () => void;
  footer?: ReactNode | null;
  children?: ReactNode;
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function Drawer({
  open,
  title,
  placement = 'right',
  width = 378,
  closable = true,
  maskClosable = true,
  onClose,
  footer,
  children,
}: DrawerProps) {
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // 进入：下一帧触发 ready 以应用过渡
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // 退出：保持挂载以播放退出动画
  useEffect(() => {
    if (open) {
      setExiting(false);
      setReady(false);
    } else {
      setExiting(true);
      const id = setTimeout(() => setExiting(false), 200);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  // 锁定 body 滚动
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open && !exiting) return null;

  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  return typeof document === 'undefined' ? null : createPortal(
    <>
      <div
        className={`novel-drawer__mask ${ready ? 'is-ready' : ''}`}
        onClick={() => maskClosable && onClose?.()}
      />
      <div
        ref={panelRef}
        className={`novel-drawer novel-drawer--${placement} ${ready ? 'is-ready' : ''}`}
        style={{ width: widthStyle }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {(title != null || closable) && (
          <div className="novel-drawer__header">
            <div className="novel-drawer__title">{title}</div>
            {closable ? (
              <button type="button" className="novel-drawer__close" onClick={onClose} aria-label="关闭">
                <CloseIcon />
              </button>
            ) : null}
          </div>
        )}
        <div className="novel-drawer__body">{children}</div>
        {footer != null ? <div className="novel-drawer__footer">{footer}</div> : null}
      </div>
    </>,
    document.body,
  );
}
