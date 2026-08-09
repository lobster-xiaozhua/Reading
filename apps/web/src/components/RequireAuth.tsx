/* ============================================================
 * 私有页路由守卫：未登录跳转 /login?redirect=原路径
 * 登录后自动回跳原页面（LoginPage 已支持 redirect 参数）
 * ============================================================ */

import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
