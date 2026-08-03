import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** 重试按钮文案 */
  retryText?: string;
  /** 点击重试回调 */
  onRetry?: () => void;
}

/**
 * 通用错误态（模块/页面级加载失败）
 */
export function ErrorState({
  title = '加载失败',
  description = '网络开小差了，请稍后重试',
  retryText = '重试',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <svg
        className="error-state__icon"
        viewBox="0 0 120 120"
        width="96"
        height="96"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="60" cy="54" r="30" />
        <path d="M60 42v18" />
        <path d="M60 70h.01" />
        <path d="M46 98h28" opacity="0.6" />
      </svg>
      <h3 className="error-state__title">{title}</h3>
      {description ? <p className="error-state__desc">{description}</p> : null}
      {onRetry ? (
        <button type="button" className="error-state__retry" onClick={onRetry}>
          {retryText}
        </button>
      ) : null}
    </div>
  );
}
