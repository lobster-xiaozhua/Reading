/* ============================================================
 * LoadingState · 统一数据加载三态组件
 * 将 loading / empty / error 三种状态合一，消除页面重复样板代码。
 *
 * 用法：
 *   <LoadingState
 *     loading={loading}
 *     error={status === "error"}
 *     isEmpty={items.length === 0}
 *     emptyTitle="暂无数据"
 *     onRetry={run}
 *   >
 *     {渲染内容}
 *   </LoadingState>
 *
 * 自定义骨架：
 *   <LoadingState loading={loading} skeleton={<CustomSkeleton />}>
 *     ...
 *   </LoadingState>
 * ============================================================ */

import type { ReactNode } from "react";
import { EmptyState, Skeleton } from "@novel/components";
import { ErrorState } from "./ErrorState";

interface LoadingStateProps {
  /** 是否加载中（显示骨架屏） */
  loading: boolean;
  /** 是否出错（显示错误态 + 重试） */
  error?: boolean;
  /** 是否空数据（显示空态） */
  isEmpty?: boolean;
  /** 空态标题 */
  emptyTitle?: string;
  /** 空态描述 */
  emptyDescription?: string;
  /** 空态操作（如"去发现好书"链接） */
  emptyAction?: ReactNode;
  /** 错误态标题 */
  errorTitle?: string;
  /** 默认骨架屏行数 */
  skeletonRows?: number;
  /** 自定义骨架节点（替代默认 Skeleton） */
  skeleton?: ReactNode;
  /** 重试回调 */
  onRetry?: () => void;
  /** 正常内容 */
  children: ReactNode;
}

/**
 * 三态合一：加载中 → 骨架屏；出错 → 错误态+重试；空 → 空态；否则渲染内容。
 */
export function LoadingState({
  loading,
  error = false,
  isEmpty = false,
  emptyTitle = "暂无数据",
  emptyDescription,
  emptyAction,
  errorTitle,
  skeletonRows = 4,
  skeleton,
  onRetry,
  children,
}: LoadingStateProps) {
  if (loading) {
    return skeleton ? <>{skeleton}</> : <Skeleton rows={skeletonRows} />;
  }
  if (error) {
    return <ErrorState title={errorTitle} onRetry={onRetry} />;
  }
  if (isEmpty) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }
  return <>{children}</>;
}

export default LoadingState;