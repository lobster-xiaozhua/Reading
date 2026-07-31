/* ============================================================
 * P6-7 · 角色 / 权限分配 Mock API
 * 角色列表 / 角色详情 / 权限分配 / 用户-角色绑定
 * Source: 04 §10.7 / P6-7
 * ============================================================ */

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

/** 内置角色权限映射（对齐 P0-8 权限点定义） */
const BUILTIN_ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  'super-admin': [...ALL_PERMISSIONS],
  'content-admin': [
    'novel.list', 'novel.create', 'novel.edit', 'novel.shelve',
    'chapter.list', 'chapter.create', 'chapter.edit',
    'author.list', 'author.edit',
  ],
  'operation-admin': [
    'novel.list', 'novel.shelve',
    'chapter.list',
    'audit.list',
    'user.list',
    'royalty.list',
  ],
  'finance-admin': [
    'royalty.list', 'royalty.export',
    'novel.list',
  ],
  'auditor': [
    'audit.list', 'audit.approve', 'audit.reject',
    'novel.list',
    'chapter.list',
  ],
};

/** Mock 角色列表 */
let MOCK_ROLES: RoleMeta[] = [
  {
    key: 'super-admin',
    name: '超级管理员',
    description: '拥有系统全部权限，仅技术负责人持有',
    dataScope: 'all',
    builtin: true,
    permissions: BUILTIN_ROLE_PERMISSIONS['super-admin'],
    userCount: 2,
  },
  {
    key: 'content-admin',
    name: '内容管理员',
    description: '负责作品与章节的内容生产管理',
    dataScope: 'all',
    builtin: true,
    permissions: BUILTIN_ROLE_PERMISSIONS['content-admin'],
    userCount: 8,
  },
  {
    key: 'operation-admin',
    name: '运营管理员',
    description: '负责作品上下架、审核派单、用户运营',
    dataScope: 'department',
    builtin: true,
    permissions: BUILTIN_ROLE_PERMISSIONS['operation-admin'],
    userCount: 15,
  },
  {
    key: 'auditor',
    name: '审核员',
    description: '负责章节内容审核与驳回',
    dataScope: 'self',
    builtin: true,
    permissions: BUILTIN_ROLE_PERMISSIONS['auditor'],
    userCount: 23,
  },
  {
    key: 'finance-admin',
    name: '财务管理员',
    description: '负责稿费结算与导出',
    dataScope: 'department',
    builtin: true,
    permissions: BUILTIN_ROLE_PERMISSIONS['finance-admin'],
    userCount: 3,
  },
];

function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

/** 拉取角色列表 */
export async function fetchRoleList(): Promise<RoleMeta[]> {
  return delay(MOCK_ROLES.map((r) => ({ ...r, permissions: [...r.permissions] })));
}

/** 拉取单个角色详情 */
export async function fetchRoleDetail(key: AdminRole): Promise<RoleMeta | null> {
  const role = MOCK_ROLES.find((r) => r.key === key);
  return delay(role ? { ...role, permissions: [...role.permissions] } : null);
}

/** 更新角色权限（超级管理员权限不可修改） */
export async function updateRolePermissions(
  key: AdminRole,
  permissions: Permission[],
): Promise<{ success: boolean; reason?: string }> {
  if (key === 'super-admin') {
    return { success: false, reason: '超级管理员权限不可修改' };
  }
  const role = MOCK_ROLES.find((r) => r.key === key);
  if (!role) return { success: false, reason: '角色不存在' };
  role.permissions = [...permissions];
  return delay({ success: true }, 300);
}

/** 更新角色信息（名称/描述/数据范围） */
export async function updateRoleMeta(
  key: AdminRole,
  patch: Partial<Pick<RoleMeta, 'name' | 'description' | 'dataScope'>>,
): Promise<{ success: boolean }> {
  const role = MOCK_ROLES.find((r) => r.key === key);
  if (role) Object.assign(role, patch);
  return delay({ success: true }, 200);
}

/** 全量权限点（用于权限分配树） */
export async function fetchAllPermissions() {
  return delay(PERMISSION_LIST);
}
