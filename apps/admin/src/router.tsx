/* ============================================================
 * P0-7 · 路由骨架
 * - React Router v6（与 C 端一致）
 * - 4 大模块占位路由：工作台 / 内容管理 / 用户管理 / 系统设置
 * - 登录页与 404 页为公开路由
 * - RequireAuth 守卫包裹受保护路由（P0-13）
 * ============================================================ */

import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { BEndLayout } from "./layouts/BEndLayout";
import { RequireAuth } from "./router/RequireAuth";
import { RequirePermission } from "./router/RequirePermission";
import { Spin } from "antd";
import { initRoutePrefetch } from "./utils/routePrefetchRegistry";

// 路由级代码分割
const LoginPage = lazy(() => import("./pages/LoginPage"));
const WorkbenchPage = lazy(() => import("./pages/WorkbenchPage"));
const NovelListPage = lazy(() => import("./pages/NovelListPage"));
const NovelDetailPage = lazy(() => import("./pages/NovelDetailPage"));
const NovelFormPage = lazy(() => import("./pages/NovelFormPage"));
const ChapterListPage = lazy(() => import("./pages/ChapterListPage"));
const AuditWorkbenchPage = lazy(() => import("./pages/AuditWorkbenchPage"));
const ChartsShowcasePage = lazy(() => import("./pages/ChartsShowcasePage"));
const RoyaltyPage = lazy(() => import("./pages/RoyaltyPage"));
const PermissionPage = lazy(() => import("./pages/PermissionPage"));
const UserListPage = lazy(() => import("./pages/UserListPage"));
const SystemConfigPage = lazy(() => import("./pages/SystemConfigPage"));
const OperationsPage = lazy(() => import("./pages/OperationsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const withSuspense = (node: React.ReactNode) => (
  <Suspense
    fallback={
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "var(--space-12)",
        }}
      >
        <Spin size="large" />
      </div>
    }
  >
    {node}
  </Suspense>
);

export const router: ReturnType<typeof createBrowserRouter> =
  createBrowserRouter([
    {
      path: "/login",
      element: withSuspense(<LoginPage />),
    },
    {
      path: "/",
      element: (
        <RequireAuth>
          <BEndLayout />
        </RequireAuth>
      ),
      children: [
        { index: true, element: <Navigate to="/workbench" replace /> },
        { path: "workbench", element: withSuspense(<WorkbenchPage />) },
        // 内容管理模块（P4 实例化）
        { path: "novel", element: withSuspense(<NovelListPage />) },
        { path: "novel/create", element: withSuspense(<NovelFormPage />) },
        { path: "novel/:novelId", element: withSuspense(<NovelDetailPage />) },
        {
          path: "novel/:novelId/edit",
          element: withSuspense(<NovelFormPage />),
        },
        // 内容管理模块（P5 实例化）
        {
          path: "chapter/:novelId",
          element: withSuspense(<ChapterListPage />),
        },
        { path: "audit", element: withSuspense(<AuditWorkbenchPage />) },
        // P7 · 数据可视化看板
        { path: "charts", element: withSuspense(<ChartsShowcasePage />) },
        // P8-2 · 稿费管理
        { path: "royalty", element: withSuspense(<RoyaltyPage />) },
        // 用户管理模块（P6 接入权限分配页 + 页面级守卫）
        { path: "user", element: withSuspense(<UserListPage />) },
        { path: "author", element: withSuspense(<UserListPage />) },
        {
          path: "permission",
          element: withSuspense(
            <RequirePermission permissions={["permission.assign"]}>
              <PermissionPage />
            </RequirePermission>,
          ),
        },
        // 系统设置模块
        { path: "system", element: withSuspense(<SystemConfigPage />) },
        {
          path: "operations",
          element: withSuspense(
            <RequirePermission permissions={["system.config"]}>
              <OperationsPage />
            </RequirePermission>,
          ),
        },
      ],
    },
    { path: "/404", element: withSuspense(<NotFoundPage />) },
    { path: "*", element: <Navigate to="/404" replace /> },
  ]);

// 路由速通：注册预加载策略，登录后空闲预取业务路由
initRoutePrefetch();
