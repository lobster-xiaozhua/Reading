/* ============================================================
 * P0-8 · B 端管理员用户类型
 * 后续将迁移到 packages/types（P2-21）
 * ============================================================ */

/** 管理员角色 */
export type AdminRole =
  | "super-admin"
  | "content-admin"
  | "operation-admin"
  | "finance-admin"
  | "auditor";

/** 管理员权限点（P6 阶段细化） */
export type Permission =
  | "novel.list"
  | "novel.create"
  | "novel.edit"
  | "novel.delete"
  | "novel.shelve"
  | "chapter.list"
  | "chapter.create"
  | "chapter.edit"
  | "chapter.delete"
  | "audit.list"
  | "audit.approve"
  | "audit.revise"
  | "audit.reject"
  | "author.list"
  | "author.edit"
  | "royalty.list"
  | "royalty.export"
  | "user.list"
  | "user.edit"
  | "permission.assign"
  | "system.config";

/** 管理员用户信息 */
export interface AdminUser {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  email: string;
  roles: AdminRole[];
  permissions: Permission[];
  lastLoginAt: number;
  /** 是否启用 */
  enabled: boolean;
}

/** 登录凭证 */
export interface LoginCredentials {
  username: string;
  password: string;
  remember?: boolean;
}

/** 登录响应 */
export interface LoginResponse {
  token: string;
  user: AdminUser;
  /** token 过期时间戳（ms），默认 8 小时 */
  expiresAt: number;
  refreshToken?: string;
}
