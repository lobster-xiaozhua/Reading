/* ============================================================
 * P6-3 · Authorized 操作级权限组件
 * 通过 permission 控制子节点可见性，无权限渲染 fallback
 * 用法：<Authorized permission="novel.create"><Button>新建</Button></Authorized>
 * Source: 04 §10.3 / P6-3
 * ============================================================ */

import type { ReactNode } from "react";
import type { Permission } from "@/api/types";
import { usePermission } from "@/hooks/usePermission";

export interface AuthorizedProps {
  /** 所需权限点（单个） */
  permission?: Permission;
  /** 所需权限点（多个，任一持有即通过） */
  anyOf?: Permission[];
  /** 所需权限点（多个，全部持有才通过） */
  allOf?: Permission[];
  /** 所需角色 */
  role?: Parameters<ReturnType<typeof usePermission>["hasRole"]>[0];
  /** 通过权限渲染的内容 */
  children: ReactNode;
  /** 无权限时的兜底渲染（默认 null） */
  fallback?: ReactNode;
}

export function Authorized({
  permission,
  anyOf,
  allOf,
  role,
  children,
  fallback = null,
}: AuthorizedProps) {
  const { has, hasAny, hasAll, hasRole } = usePermission();

  let ok = true;
  if (permission) ok = ok && has(permission);
  if (anyOf && anyOf.length > 0) ok = ok && hasAny(anyOf);
  if (allOf && allOf.length > 0) ok = ok && hasAll(allOf);
  if (role) ok = ok && hasRole(role);

  return <>{ok ? children : fallback}</>;
}
