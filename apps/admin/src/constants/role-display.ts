/* ============================================================
 * P6 · 角色展示辅助常量
 * 与权限常量分离，避免在页面组件中重复定义
 * Source: P6-7
 * ============================================================ */

import type { DataScope } from '@/api/data-scope';
import { PERMISSION_TREE } from '@/constants/permissions';

/** 数据范围中文标签（页面展示用，重导出避免循环依赖） */
export const DATA_SCOPE_LABEL_HELPER: Record<DataScope, string> = {
  all: '全部数据',
  department: '部门数据',
  self: '仅个人数据',
};

/** 重导出权限树，便于页面统一引用 */
export { PERMISSION_TREE };
