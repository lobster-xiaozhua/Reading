/* ============================================================
 * P1-3 · 侧边导航 SiderMenu
 * 最多 3 级菜单；展开 240 / 折叠 80；激活态 brand-bg + brand 文字
 * 菜单图标 20px / 间距 12px；一级 48 / 二级 40 / 三级 36px
 * 04 §8.3 / §10.1 菜单级权限
 * ============================================================ */

import { useMemo } from 'react';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { menuConfig, type MenuItem } from './menu-config';
import { useAuthStore } from '@/stores/authStore';
import type { Permission } from '@/api/types';

type AntdMenuItem = NonNullable<MenuProps['items']>[number];

const Sider = Layout.Sider;

interface SiderMenuProps {
  collapsed: boolean;
}

/** 按权限过滤菜单树，并转换为 AntD Menu items */
function buildItems(items: MenuItem[], hasPermission: (p: Permission) => boolean): AntdMenuItem[] {
  const result: AntdMenuItem[] = [];
  for (const item of items) {
    // 权限过滤：无 permissions 字段则登录即可见；多个权限任一持有即可见
    if (item.permissions && item.permissions.length > 0) {
      const visible = item.permissions.some((p) => hasPermission(p));
      if (!visible) continue;
    }
    const node: AntdMenuItem = {
      key: item.key,
      icon: item.icon,
      label: item.label,
    };
    if (item.path) {
      // 叶子节点：记录 path 用于点击跳转
      (node as AntdMenuItem & { path?: string }).path = item.path;
    }
    if (item.children && item.children.length > 0) {
      const children = buildItems(item.children, hasPermission);
      if (children.length === 0) continue; // 子菜单全无权限则隐藏父级
      (node as AntdMenuItem & { children?: AntdMenuItem[] }).children = children;
    }
    result.push(node);
  }
  return result;
}

/** 从当前路径解析选中的菜单 key 与需展开的分组 key */
function resolveSelectedKeys(pathname: string): { selected: string[]; opened: string[] } {
  // 顶层 path 直接匹配（如 /workbench /system）
  for (const item of menuConfig) {
    if (item.path === pathname) {
      return { selected: [item.key], opened: [] };
    }
  }
  // 二级 path 匹配
  for (const parent of menuConfig) {
    if (!parent.children) continue;
    for (const child of parent.children) {
      if (child.path && pathname.startsWith(child.path)) {
        return { selected: [child.key], opened: [parent.key] };
      }
    }
  }
  return { selected: [], opened: [] };
}

export function SiderMenu({ collapsed }: SiderMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const items = useMemo(() => buildItems(menuConfig, hasPermission), [hasPermission]);

  const { selected, opened } = useMemo(
    () => resolveSelectedKeys(location.pathname),
    [location.pathname],
  );

  const handleClick: MenuProps['onClick'] = (info) => {
    // 在 buildItems 中将 path 挂到了节点上；这里从原始配置反查更稳妥
    const findPath = (list: MenuItem[]): string | undefined => {
      for (const it of list) {
        if (it.key === info.key && it.path) return it.path;
        if (it.children) {
          const sub = findPath(it.children);
          if (sub) return sub;
        }
      }
      return undefined;
    };
    const path = findPath(menuConfig);
    if (path) navigate(path);
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      collapsedWidth={80}
      className="bend-sider"
      aria-label="主导航"
    >
      <div className="bend-sider__logo">
        {collapsed ? (
          <span className="bend-sider__logo-mark" aria-label="Atlas">
            A
          </span>
        ) : (
          <span className="bend-sider__logo-text">Atlas 运营后台</span>
        )}
      </div>
      <Menu
        mode="inline"
        theme="light"
        selectedKeys={selected}
        defaultOpenKeys={opened}
        openKeys={collapsed ? [] : opened}
        items={items}
        onClick={handleClick}
        className="bend-sider__menu"
      />
    </Sider>
  );
}
