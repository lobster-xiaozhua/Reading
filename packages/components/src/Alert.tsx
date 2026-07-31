/* ============================================================
 * Alert / Message / Notification · 02 §1.13
 * - Alert: 内联 React 组件
 * - message / notification: 命令式 API（基于 portal + 内部状态管理）
 * ============================================================ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/* ---------- 共用图标（inline，避免依赖 icons 包运行时） ---------- */

const ICONS = {
  success: (<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8.5 12.5l2.5 2.5 4.5-5" />),
  warning: (<><path d="M12 3l9 16H3z" /><path d="M12 9v4M12 16v.5" /></>),
  error: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16v.5" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.5" /></>),
} as const;

const STATUS_ICONS = {
  success: (<><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>),
  warning: (<><path d="M12 3l9 16H3z" /><path d="M12 9v4M12 16v.5" /></>),
  error: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16v.5" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.5" /></>),
} as const;

function Icon({ path, className }: { path: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {path}
    </svg>
  );
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/* ============ Alert ============ */

export type AlertType = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps {
  type?: AlertType;
  message: ReactNode;
  description?: ReactNode;
  closable?: boolean;
  onClose?: () => void;
}

export function Alert({ type = 'info', message, description, closable = false, onClose }: AlertProps) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  const handleClose = () => {
    setClosed(true);
    onClose?.();
  };

  return (
    <div className={`novel-alert novel-alert--${type}`} role="alert">
      <Icon path={ICONS[type]} className="novel-alert__icon" />
      <div className="novel-alert__body">
        <div className="novel-alert__message">{message}</div>
        {description != null ? <div className="novel-alert__description">{description}</div> : null}
      </div>
      {closable ? (
        <button type="button" className="novel-alert__close" onClick={handleClose} aria-label="关闭">
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}

/* ============ Message / Notification 共享 ============ */

interface MsgItem {
  key: string;
  type: AlertType;
  content: ReactNode;
  ready: boolean;
}

interface NotifItem {
  key: string;
  type: AlertType;
  title: ReactNode;
  description?: ReactNode;
  ready: boolean;
}

interface FeedbackContextValue {
  message: (type: AlertType, content: ReactNode, duration?: number) => void;
  notification: (opts: {
    type?: AlertType;
    title: ReactNode;
    description?: ReactNode;
    duration?: number;
  }) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

/** Provider 应在应用根节点包裹 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [msgs, setMsgs] = useState<MsgItem[]>([]);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const counter = useRef(0);

  const removeMsg = useCallback((key: string) => {
    setMsgs((list) => list.filter((m) => m.key !== key));
  }, []);
  const removeNotif = useCallback((key: string) => {
    setNotifs((list) => list.filter((n) => n.key !== key));
  }, []);

  const message = useCallback<FeedbackContextValue['message']>((type, content, duration = 3) => {
    const key = `m${counter.current++}`;
    setMsgs((list) => [...list, { key, type, content, ready: false }]);
    requestAnimationFrame(() => {
      setMsgs((list) => list.map((m) => (m.key === key ? { ...m, ready: true } : m)));
    });
    if (duration > 0) {
      setTimeout(() => removeMsg(key), duration * 1000);
    }
  }, [removeMsg]);

  const notification = useCallback<FeedbackContextValue['notification']>((opts) => {
    const { type = 'info', title, description, duration = 4.5 } = opts;
    const key = `n${counter.current++}`;
    setNotifs((list) => [...list, { key, type, title, description, ready: false }]);
    requestAnimationFrame(() => {
      setNotifs((list) => list.map((n) => (n.key === key ? { ...n, ready: true } : n)));
    });
    if (duration > 0) {
      setTimeout(() => removeNotif(key), duration * 1000);
    }
  }, [removeNotif]);

  // 限制 Notification 最多 3 条
  useEffect(() => {
    if (notifs.length > 3) {
      setNotifs((list) => list.slice(list.length - 3));
    }
  }, [notifs.length]);

  const value = useMemo<FeedbackContextValue>(() => ({ message, notification }), [message, notification]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' ? createPortal(
        <>
          {msgs.length > 0 ? (
            <div className="novel-message-container" aria-live="polite">
              {msgs.map((m) => (
                <div key={m.key} className={`novel-message ${m.ready ? 'is-ready' : ''}`} role="status">
                  <Icon path={STATUS_ICONS[m.type]} className="novel-message__icon" />
                  <span>{m.content}</span>
                </div>
              ))}
            </div>
          ) : null}
          {notifs.length > 0 ? (
            <div className="novel-notification-container" aria-live="polite">
              {notifs.map((n) => (
                <div key={n.key} className={`novel-notification ${n.ready ? 'is-ready' : ''}`} role="alert">
                  <Icon path={STATUS_ICONS[n.type]} className="novel-alert__icon" />
                  <div className="novel-notification__body">
                    <div className="novel-notification__title">{n.title}</div>
                    {n.description != null ? (
                      <div className="novel-notification__description">{n.description}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="novel-notification__close"
                    onClick={() => removeNotif(n.key)}
                    aria-label="关闭"
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </>,
        document.body,
      ) : null}
    </FeedbackContext.Provider>
  );
}

/** Hook：消费 message / notification 命令式 API */
export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback 必须在 <FeedbackProvider> 内使用');
  }
  return ctx;
}

/**
 * 命令式 message 入口（需要应用根已挂 FeedbackProvider）。
 * 用法：const { message } = useFeedback(); message.success('已保存');
 */
export function createMessageApi(ctx: FeedbackContextValue) {
  return {
    success: (content: ReactNode, duration?: number) => ctx.message('success', content, duration),
    warning: (content: ReactNode, duration?: number) => ctx.message('warning', content, duration),
    error: (content: ReactNode, duration?: number) => ctx.message('error', content, duration),
    info: (content: ReactNode, duration?: number) => ctx.message('info', content, duration),
  };
}

export function createNotificationApi(ctx: FeedbackContextValue) {
  return {
    open: (opts: Parameters<FeedbackContextValue['notification']>[0]) => ctx.notification(opts),
    success: (title: ReactNode, description?: ReactNode, duration?: number) =>
      ctx.notification({ type: 'success', title, description, duration }),
    warning: (title: ReactNode, description?: ReactNode, duration?: number) =>
      ctx.notification({ type: 'warning', title, description, duration }),
    error: (title: ReactNode, description?: ReactNode, duration?: number) =>
      ctx.notification({ type: 'error', title, description, duration }),
    info: (title: ReactNode, description?: ReactNode, duration?: number) =>
      ctx.notification({ type: 'info', title, description, duration }),
  };
}
