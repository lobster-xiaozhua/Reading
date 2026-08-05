/* ============================================================
 * Modal · 02 §1.4
 * 遮罩 + 缩放渐显；Esc 关闭；focus trap（简化版）
 * ============================================================ */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { NavigationClose } from '@novel/icons';

export interface ModalProps {
  open: boolean;
  title?: ReactNode;
  width?: number | string;
  closable?: boolean;
  maskClosable?: boolean;
  onCancel?: () => void;
  footer?: ReactNode | null;
  children?: ReactNode;
}



export function Modal({
  open,
  title,
  width = 480,
  closable = true,
  maskClosable = true,
  onCancel,
  footer,
  children,
}: ModalProps) {
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (open) {
      setExiting(false);
      setReady(false);
    } else {
      setExiting(true);
      const id = setTimeout(() => setExiting(false), 240);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', onEsc);
    // 简易 focus trap：打开后聚焦 modal
    const prevActive = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onEsc);
      prevActive?.focus?.();
    };
  }, [open, onCancel]);

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
        className={`novel-modal__mask ${ready ? 'is-ready' : ''}`}
        onClick={() => maskClosable && onCancel?.()}
      />
      <div
        ref={modalRef}
        className={`novel-modal ${ready ? 'is-ready' : ''}`}
        style={{ width: widthStyle }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
      >
        {(title != null || closable) && (
          <div className="novel-modal__header">
            <div>{title}</div>
            {closable ? (
              <button type="button" className="novel-modal__close" onClick={onCancel} aria-label="关闭">
                <NavigationClose size="sm" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        )}
        <div className="novel-modal__body">{children}</div>
        {footer !== null ? (
          <div className="novel-modal__footer">{footer}</div>
        ) : null}
      </div>
    </>,
    document.body,
  );
}
