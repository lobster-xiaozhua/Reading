/* ============================================================
 * P6-6 · usePermission Hook
 * 封装权限判断逻辑，支持单点 / 多点（any/all）+ 角色判断
 * Source: 04 §10.4 / P6-6
 * ============================================================ */

import { useAuthStore } from "@/stores/authStore";
import type { Permission } from "@/api/types";
import type { AdminRole } from "@/api/types";

export interface UsePermissionResult {
  /** 是否持有单个权限 */
  has: (perm: Permission) => boolean;
  /** 是否持有任一权限（OR） */
  hasAny: (perms: Permission[]) => boolean;
  /** 是否持有全部权限（AND） */
  hasAll: (perms: Permission[]) => boolean;
  /** 是否为指定角色 */
  hasRole: (role: AdminRole) => boolean;
  /** 是否为超级管理员（拥有全部权限） */
  isSuperAdmin: boolean;
  /** 当前用户的所有权限点 */
  permissions: Permission[];
}

export function usePermission(): UsePermissionResult {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasRoleStore = useAuthStore((s) => s.hasRole);

  const permissions = user?.permissions ?? [];
  const isSuperAdmin = user?.roles.includes("super-admin") ?? false;

  return {
    has: hasPermission,
    hasAny: (perms) => perms.some((p) => hasPermission(p)),
    hasAll: (perms) => perms.every((p) => hasPermission(p)),
    hasRole: hasRoleStore,
    isSuperAdmin,
    permissions,
  };
}
