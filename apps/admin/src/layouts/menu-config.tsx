/* ============================================================
 * P1-7 · 菜单数据驱动 + 权限渲染挂钩
 * 菜单项带 permission 字段，SiderMenu 据此过滤无权限项
 * 04 §8.3 / §10 菜单级权限
 * ============================================================ */

import type { ReactNode } from 'react';
import {
  DashboardOutlined,
  BookOutlined,
  AuditOutlined,
  TeamOutlined,
  SolutionOutlined,
  SafetyOutlined,
  SettingOutlined,
  BarChartOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { Permission } from '@/api/types';

export interface MenuItem {
  /** 路由 key，唯一 */
  key: string;
  /** 显示文案 */
  label: string;
  /** 路由路径（叶子节点必填；分组节点可不填） */
  path?: string;
  /** 图标 */
  icon?: ReactNode;
  /** 所需权限点；不填则登录即可见；多个为「任一持有即可见」 */
  permissions?: Permission[];
  /** 子菜单（最多 3 级） */
  children?: MenuItem[];
  /** 是否首页 Tab（不可关闭） */
  isHome?: boolean;
}

/**
 * B 端菜单树（数据驱动，权限挂钩）
 * 结构对齐 router.tsx 4 大模块
 */
export const menuConfig: MenuItem[] = [
  {
    key: 'workbench',
    label: '工作台',
    path: '/workbench',
    icon: <DashboardOutlined />,
    isHome: true,
  },
  {
    key: 'content',
    label: '内容管理',
    icon: <BookOutlined />,
    children: [
      {
        key: 'novel',
        label: '作品管理',
        path: '/novel',
        icon: <BookOutlined />,
        permissions: ['novel.list'],
      },
      {
        key: 'audit',
        label: '内容审核',
        path: '/audit',
        icon: <AuditOutlined />,
        permissions: ['audit.list'],
      },
      {
        key: 'charts',
        label: '数据看板',
        path: '/charts',
        icon: <BarChartOutlined />,
      },
    ],
  },
  {
    key: 'user-mgmt',
    label: '用户管理',
    icon: <TeamOutlined />,
    children: [
      {
        key: 'user',
        label: '读者列表',
        path: '/user',
        icon: <TeamOutlined />,
        permissions: ['user.list'],
      },
      {
        key: 'author',
        label: '作者管理',
        path: '/author',
        icon: <SolutionOutlined />,
        permissions: ['author.list'],
      },
      {
        key: 'permission',
        label: '角色权限',
        path: '/permission',
        icon: <SafetyOutlined />,
        permissions: ['permission.assign'],
      },
    ],
  },
  {
    key: 'system',
    label: '系统设置',
    path: '/system',
    icon: <SettingOutlined />,
    permissions: ['system.config'],
  },
  {
    key: 'royalty',
    label: '稿费管理',
    path: '/royalty',
    icon: <DollarOutlined />,
  },
];

/** 首页 Tab（工作台，不可关闭） */
export const HOME_TAB_KEY = 'workbench';
