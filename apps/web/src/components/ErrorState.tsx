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
      <img src="/src/assets/illustrations/error-state.svg" alt="" width="120" height="120" aria-hidden="true" />
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
