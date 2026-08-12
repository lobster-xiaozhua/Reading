/* ============================================================
 * P6-2 · RequirePermission 页面级路由守卫
 * 在 RequireAuth（登录态）之上叠加细粒度权限校验
 * 无权限渲染 <Result status="403"> 兜底
 * Source: 04 §10.5 / P6-2
 * ============================================================ */

import type { ReactNode } from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import type { Permission } from "@/api/types";
import { usePermission } from "@/hooks/usePermission";
import { BrandResult } from "@/components/BrandResult";

export interface RequirePermissionProps {
  /** 所需权限点（任一持有即可访问） */
  permissions?: Permission[];
  /** 所需角色 */
  role?: Parameters<ReturnType<typeof usePermission>["hasRole"]>[0];
  children: ReactNode;
}

export function RequirePermission({
  permissions,
  role,
  children,
}: RequirePermissionProps) {
  const navigate = useNavigate();
  const { hasAny, hasRole, isSuperAdmin } = usePermission();

  // 超级管理员直接放行
  if (isSuperAdmin) return <>{children}</>;

  let ok = true;
  if (permissions && permissions.length > 0) ok = ok && hasAny(permissions);
  if (role) ok = ok && hasRole(role);

  if (!ok) {
    return (
      <BrandResult
        status="403"
        title="403"
        subTitle="抱歉，您没有访问该页面的权限。"
        extra={
          <Button type="primary" onClick={() => navigate("/workbench")}>
            返回工作台
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
