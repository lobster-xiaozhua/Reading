/* ============================================================
 * B 端角色权限 API：对接后端 /api/v1/b 真实接口
 * 角色列表 / 角色详情 / 权限分配 / 用户-角色绑定
 * Source: 04 §10.7 / P6-7
 * ============================================================ */

import { http, ApiError } from './http';
import type { AdminRole, Permission } from '@/api/types';
import { ALL_PERMISSIONS, PERMISSION_LIST } from '@/constants/permissions';

/** 角色元信息 */
export interface RoleMeta {
  key: AdminRole;
  name: string;
  description: string;
  /** 数据范围 */
  dataScope: 'all' | 'department' | 'self';
  /** 是否内置（不可删除） */
  builtin: boolean;
  /** 该角色拥有的权限点 */
  permissions: Permission[];
  /** 用户数 */
  userCount: number;
}

interface BackendRole {
  roleKey: string;
  name: string;
  description?: string;
  dataScope?: string;
  builtin?: boolean;
  userCount?: number;
  permissions?: string[];
}

function mapRole(raw: BackendRole): RoleMeta {
  return {
    key: raw.roleKey as AdminRole,
    name: raw.name ?? raw.roleKey,
    description: raw.description ?? '',
    dataScope: (raw.dataScope as RoleMeta['dataScope']) ?? 'all',
    builtin: Boolean(raw.builtin),
    permissions: (raw.permissions ?? []) as Permission[],
    userCount: Number(raw.userCount ?? 0),
  };
}

/** 拉取角色列表 */
export async function fetchRoleList(): Promise<RoleMeta[]> {
  const data = await http.get<BackendRole[]>('/roles');
  return (data ?? []).map(mapRole);
}

/** 拉取单个角色详情 */
export async function fetchRoleDetail(key: AdminRole): Promise<RoleMeta | null> {
  try {
    const data = await http.get<BackendRole>(`/roles/${key}`);
    return mapRole(data);
  } catch {
    return null;
  }
}

/** 更新角色权限（超级管理员权限不可修改） */
export async function updateRolePermissions(
  key: AdminRole,
  permissions: Permission[],
): Promise<{ success: boolean; reason?: string }> {
  if (key === 'super-admin') {
    return { success: false, reason: '超级管理员权限不可修改' };
  }
  try {
    await http.put(`/roles/${key}/permissions`, { permissions });
    return { success: true };
  } catch (err) {
    if (err instanceof ApiError) return { success: false, reason: err.message };
    return { success: false, reason: '权限更新失败' };
  }
}

/** 更新角色信息（名称/描述/数据范围） */
export async function updateRoleMeta(
  key: AdminRole,
  patch: Partial<Pick<RoleMeta, 'name' | 'description' | 'dataScope'>>,
): Promise<{ success: boolean }> {
  try {
    await http.patch(`/roles/${key}`, {
      name: patch.name ?? undefined,
      description: patch.description ?? undefined,
      dataScope: patch.dataScope ?? undefined,
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/** 全量权限点（用于权限分配树） */
export async function fetchAllPermissions() {
  try {
    const data = await http.get<{ key: string; label: string; module: string; description?: string }[]>(
      '/permissions',
    );
    if (data && data.length > 0) {
      return data.map((p) => ({
        key: p.key as Permission,
        label: p.label,
        module: p.module,
        description: p.description,
      }));
    }
  } catch {
    // 后端无权限点时回退本地常量
  }
  return PERMISSION_LIST;
}

/** 全部权限点（供超级管理员快捷全选） */
export const ALL_ROLE_PERMISSIONS: Permission[] = ALL_PERMISSIONS;
