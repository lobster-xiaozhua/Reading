/* ============================================================
 * P1-4 · 顶部栏 HeaderBar
 * 折叠按钮 48 + 面包屑 flex + 全局搜索 240 + 通知 48（红点）+ 用户菜单
 * 通知未读红点 --color-feedback-error
 * 04 §8.4
 * ============================================================ */

import { useMemo } from 'react';
import { Layout, Breadcrumb, Input, Badge, Dropdown, Avatar, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { menuConfig, type MenuItem } from './menu-config';

const Header = Layout.Header;

interface HeaderBarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** 从路径解析面包屑链 */
function resolveBreadcrumb(pathname: string): MenuItem[] {
  // 顶层直接匹配
  for (const item of menuConfig) {
    if (item.path === pathname) return [item];
  }
  // 二级匹配：父 > 子
  for (const parent of menuConfig) {
    if (!parent.children) continue;
    for (const child of parent.children) {
      if (child.path && pathname.startsWith(child.path)) {
        return [parent, child];
      }
    }
  }
  return [];
}

export function HeaderBar({ collapsed, onToggle }: HeaderBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { token } = theme.useToken();

  const breadcrumbItems = useMemo(() => {
    const chain = resolveBreadcrumb(location.pathname);
    return chain.map((item) => ({ title: item.label }));
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账号设置',
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleUserMenu = (info: { key: string }) => {
    if (info.key === 'logout') handleLogout();
  };

  return (
    <Header
      className="bend-header"
      style={{ background: token.colorBgContainer, height: 64, padding: 0 }}
    >
      <button
        type="button"
        className="bend-header__collapse"
        onClick={onToggle}
        aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        aria-expanded={!collapsed}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>

      <Breadcrumb items={breadcrumbItems} className="bend-header__breadcrumb" />

      <div className="bend-header__right">
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索功能 / 作品 / 用户"
          className="bend-header__search"
          style={{ width: 240 }}
          allowClear
          aria-label="全局搜索"
        />
        <Badge count={5} size="small" offset={[-2, 4]}>
          <button
            type="button"
            className="bend-header__icon-btn"
            aria-label="通知（5 条未读）"
          >
            <BellOutlined />
          </button>
        </Badge>
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenu }}
          placement="bottomRight"
          trigger={['click']}
        >
          <button type="button" className="bend-header__user" aria-label="用户菜单">
            <Avatar size={32} src={user?.avatar} icon={<UserOutlined />} />
            <span className="bend-header__username">{user?.nickname ?? user?.username ?? '管理员'}</span>
          </button>
        </Dropdown>
      </div>
    </Header>
  );
}
