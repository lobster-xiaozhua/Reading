import type { ReactNode } from 'react';
import { Skeleton } from '@novel/components';
import { ErrorState } from './ErrorState';

interface DiscoverModuleProps {
  /** 是否加载中 */
  loading: boolean;
  /** 是否加载失败 */
  error?: boolean;
  /** 加载失败时重试回调 */
  onRetry?: () => void;
  /** 加载骨架行数 */
  skeletonRows?: number;
  children: ReactNode;
}

/**
 * 发现页模块级容错包装：
 * 加载中 → 骨架屏；失败 → 模块级错误态；正常 → 子内容
 */
export function DiscoverModule({
  loading,
  error = false,
  onRetry,
  skeletonRows = 4,
  children,
}: DiscoverModuleProps) {
  if (error) {
    return (
      <ErrorState
        title="该模块加载失败"
        description="稍后重试或刷新页面"
        onRetry={onRetry}
      />
    );
  }
  if (loading) {
    return <Skeleton rows={skeletonRows} />;
  }
  return <>{children}</>;
}
