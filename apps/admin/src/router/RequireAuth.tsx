/* ============================================================
 * P0-13 · RequireAuth 路由守卫
 * - 包裹所有需登录的路由（除 /login / /404）
 * - 未认证重定向到 /login?redirect=...
 * - token 临近过期自动 refresh
 * ============================================================ */

import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, isTokenNearExpiry } from "@/stores/authStore";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, expiresAt, refresh } = useAuthStore();
  const location = useLocation();

  // token 临近过期自动 refresh（静默）
  useEffect(() => {
    if (isAuthenticated && isTokenNearExpiry(expiresAt)) {
      refresh().catch(() => {
        // refresh 失败由全局 401 拦截器处理
      });
    }
  }, [isAuthenticated, expiresAt, refresh]);

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
