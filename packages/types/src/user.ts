/* ============================================================
 * @novel/types · 用户共享类型
 * Source: 04-B端开发计划.md P2-21
 * ============================================================ */

/** 跨端共享：用户基础字段 */
export interface UserBase {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
}

/** B 端管理员用户 = UserBase + 角色权限 */
export interface AdminUser extends UserBase {
  /** 角色列表 */
  roles: string[];
  /** 权限点列表（格式 模块:操作，如 novel:create） */
  permissions: string[];
  /** 邮箱（通知用） */
  email?: string;
  /** 账号状态 */
  status: 'active' | 'disabled';
}

/** B 端权限点（模块:操作 格式常量） */
export type Permission =
  | 'novel.list'
  | 'novel.create'
  | 'novel.edit'
  | 'novel.delete'
  | 'novel.publish'
  | 'novel.audit'
  | 'chapter.manage'
  | 'audit.list'
  | 'audit.approve'
  | 'audit.reject'
  | 'user.list'
  | 'user.manage'
  | 'author.list'
  | 'author.manage'
  | 'permission.assign'
  | 'system.config';

/** C 端读者用户 = UserBase + 读者统计 */
export interface ReaderUser extends UserBase {
  level: number;
  isVip: boolean;
  vipExpireAt?: number;
}
