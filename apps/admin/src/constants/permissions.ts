/* ============================================================
 * P6-5 · 权限标识常量与描述
 * 命名规则：模块:操作（04 §10.2）
 * 用于菜单级 / 页面级 / 操作级 / 数据级 4 层权限统一引用
 * Source: 04 §10.2 / P6-5
 * ============================================================ */

import type { Permission } from "@/api/types";

/** 权限点元信息 */
export interface PermissionMeta {
  /** 权限标识 */
  key: Permission;
  /** 中文名称 */
  label: string;
  /** 所属模块（用于权限分配树分组） */
  module: PermissionModule;
  /** 描述 */
  description?: string;
}

/** 权限模块（用于权限分配树分组） */
export type PermissionModule =
  | "novel"
  | "chapter"
  | "audit"
  | "author"
  | "royalty"
  | "user"
  | "permission"
  | "system";

/** 模块中文名映射 */
export const PERMISSION_MODULE_LABEL: Record<PermissionModule, string> = {
  novel: "作品管理",
  chapter: "章节管理",
  audit: "内容审核",
  author: "作者管理",
  royalty: "稿费管理",
  user: "用户管理",
  permission: "权限管理",
  system: "系统设置",
};

/** 全量权限点清单（用于权限分配树渲染） */
export const PERMISSION_LIST: PermissionMeta[] = [
  // 作品管理
  {
    key: "novel.list",
    label: "查看作品列表",
    module: "novel",
    description: "访问作品管理列表页",
  },
  {
    key: "novel.create",
    label: "新建作品",
    module: "novel",
    description: "创建新作品",
  },
  {
    key: "novel.edit",
    label: "编辑作品",
    module: "novel",
    description: "修改作品基本信息",
  },
  {
    key: "novel.delete",
    label: "删除作品",
    module: "novel",
    description: "永久删除作品（高危）",
  },
  {
    key: "novel.shelve",
    label: "作品上下架",
    module: "novel",
    description: "控制作品在 C 端可见性",
  },
  // 章节管理
  { key: "chapter.list", label: "查看章节列表", module: "chapter" },
  { key: "chapter.create", label: "新建章节", module: "chapter" },
  {
    key: "chapter.edit",
    label: "编辑章节",
    module: "chapter",
    description: "含拖拽排序与行内编辑",
  },
  {
    key: "chapter.delete",
    label: "删除章节",
    module: "chapter",
    description: "已发布章节需标题匹配",
  },
  // 内容审核
  { key: "audit.list", label: "查看审核队列", module: "audit" },
  {
    key: "audit.approve",
    label: "审核通过",
    module: "audit",
    description: "审核通过，作品上架",
  },
  {
    key: "audit.revise",
    label: "审核打回修改",
    module: "audit",
    description: "打回作者修改（介于通过与驳回之间）",
  },
  {
    key: "audit.reject",
    label: "审核驳回",
    module: "audit",
    description: "驳回并退回作者",
  },
  // 作者管理
  { key: "author.list", label: "查看作者列表", module: "author" },
  {
    key: "author.edit",
    label: "编辑作者",
    module: "author",
    description: "修改作者资料与签约状态",
  },
  // 稿费管理
  { key: "royalty.list", label: "查看稿费", module: "royalty" },
  {
    key: "royalty.export",
    label: "导出稿费",
    module: "royalty",
    description: "导出 Excel/PDF",
  },
  // 用户管理
  { key: "user.list", label: "查看用户列表", module: "user" },
  {
    key: "user.edit",
    label: "编辑用户",
    module: "user",
    description: "封禁/解封/调整等级",
  },
  // 权限管理
  {
    key: "permission.assign",
    label: "分配权限",
    module: "permission",
    description: "为角色分配权限点",
  },
  // 系统设置
  {
    key: "system.config",
    label: "系统配置",
    module: "system",
    description: "站点/敏感词库等配置",
  },
];

/** 按模块分组的权限树（用于 Tree 渲染） */
export interface PermissionGroup {
  module: PermissionModule;
  label: string;
  permissions: PermissionMeta[];
}

export const PERMISSION_TREE: PermissionGroup[] = PERMISSION_LIST.reduce<
  PermissionGroup[]
>((acc, meta) => {
  let group = acc.find((g) => g.module === meta.module);
  if (!group) {
    group = {
      module: meta.module,
      label: PERMISSION_MODULE_LABEL[meta.module],
      permissions: [],
    };
    acc.push(group);
  }
  group.permissions.push(meta);
  return acc;
}, []);

/** 全部权限点（用于超级管理员快捷全选） */
export const ALL_PERMISSIONS: Permission[] = PERMISSION_LIST.map((m) => m.key);
