/* ============================================================
 * P6-4 · 数据级权限 API 约定
 * 前端透传用户身份，后端返回可见数据范围（全部/部门/个人）
 * 铁律：数据级权限必须在后端严格校验，前端仅做展示控制（04 §10.6）
 * Source: 04 §10.6 / P6-4
 * ============================================================ */

import type { AdminRole } from '@/api/types';

/** 数据可见范围 */
export type DataScope = 'all' | 'department' | 'self';

/** 数据范围元信息 */
export const DATA_SCOPE_LABEL: Record<DataScope, string> = {
  all: '全部数据',
  department: '部门数据',
  self: '仅个人数据',
};

/** 角色与数据范围映射（前端展示用，真实判定由后端完成） */
export const ROLE_DATA_SCOPE: Record<AdminRole, DataScope> = {
  'super-admin': 'all',
  'content-admin': 'all',
  'operation-admin': 'department',
  'finance-admin': 'department',
  'auditor': 'self',
};

/**
 * 数据级权限请求头构造
 * 所有列表型 API 请求应携带此头，后端据此过滤
 */
export function buildDataScopeHeaders(userId: string, roles: AdminRole[]): Record<string, string> {
  // 取角色中最大范围（all > department > self）
  let scope: DataScope = 'self';
  for (const r of roles) {
    const s = ROLE_DATA_SCOPE[r];
    if (s === 'all') { scope = 'all'; break; }
    if (s === 'department' && scope === 'self') scope = 'department';
  }
  return {
    'X-User-Id': userId,
    'X-Data-Scope': scope,
    'X-Roles': roles.join(','),
  };
}

/** 请求参数扩展：列表型 API 应支持数据范围透传 */
export interface DataScopedQuery {
  /** 由 buildDataScopeHeaders 注入，此处仅作类型约束提示 */
  _dataScope?: DataScope;
}
