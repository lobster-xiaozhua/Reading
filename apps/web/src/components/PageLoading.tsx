import { Skeleton } from '@novel/components';

/**
 * 路由级加载占位（首屏 chunk 加载时）
 */
export function PageLoading() {
  return (
    <div
      className="container-page"
      style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}
      role="status"
      aria-label="页面加载中"
    >
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Skeleton rows={1} active />
      </div>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Skeleton rows={4} active />
      </div>
      <Skeleton rows={6} active />
    </div>
  );
}
