/* ============================================================
 * P0-7 · 路由骨架
 * - React Router v6（与 C 端一致）
 * - 4 大模块占位路由：工作台 / 内容管理 / 用户管理 / 系统设置
 * - 登录页与 404 页为公开路由
 * - RequireAuth 守卫包裹受保护路由（P0-13）
 * ============================================================ */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AdminLayout } from './layouts/AdminLayout';
import { RequireAuth } from './router/RequireAuth';
import { Spin } from 'antd';

// 路由级代码分割
const LoginPage = lazy(() => import('./pages/LoginPage'));
const WorkbenchPage = lazy(() => import('./pages/WorkbenchPage'));
const NovelListPage = lazy(() => import('./pages/NovelListPage'));
const UserListPage = lazy(() => import('./pages/UserListPage'));
const SystemConfigPage = lazy(() => import('./pages/SystemConfigPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const withSuspense = (node: React.ReactNode) => (
  <Suspense
    fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <Spin size="large" />
      </div>
    }
  >
    {node}
  </Suspense>
);

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/workbench" replace /> },
      { path: 'workbench', element: withSuspense(<WorkbenchPage />) },
      // 内容管理模块（P4 阶段细化）
      { path: 'novel', element: withSuspense(<NovelListPage />) },
      { path: 'novel/:novelId', element: withSuspense(<NovelListPage />) },
      { path: 'chapter/:novelId', element: withSuspense(<NovelListPage />) },
      { path: 'audit', element: withSuspense(<NovelListPage />) },
      // 用户管理模块
      { path: 'user', element: withSuspense(<UserListPage />) },
      { path: 'author', element: withSuspense(<UserListPage />) },
      { path: 'permission', element: withSuspense(<UserListPage />) },
      // 系统设置模块
      { path: 'system', element: withSuspense(<SystemConfigPage />) },
    ],
  },
  { path: '/404', element: withSuspense(<NotFoundPage />) },
  { path: '*', element: <Navigate to="/404" replace /> },
]);
