/* ============================================================
 * BottomTabBar · P7-1
 * H5 底部 4 Tab 导航：首页 / 书架 / 发现 / 我的
 *   - 高度 48px + env(safe-area-inset-bottom) 安全区适配
 *   - 触控热区 ≥ 44×44px（P7-2）
 *   - 阅读器全屏路由 /read/* 不渲染（由 ReaderLayout 控制）
 *   - 仅在 xs/sm 断点显示（≤768px），桌面端隐藏走顶部 NavBar
 *   - Tab 切换无动画位移，仅颜色变化（避免 INP 拖累）
 * ============================================================ */

import { NavLink } from 'react-router-dom';
import {
  NavigationHome,
  ContentLibrary,
  ContentCategory,
  SystemUser,
} from '@novel/icons';
import './BottomTabBar.css';

interface TabItem {
  key: string;
  label: string;
  to: string;
  icon: typeof NavigationHome;
  /** 匹配规则：end 表示仅精确匹配 */
  end?: boolean;
}

const TABS: TabItem[] = [
  { key: 'home', label: '首页', to: '/', icon: NavigationHome, end: true },
  { key: 'bookshelf', label: '书架', to: '/profile?tab=bookshelf', icon: ContentLibrary },
  { key: 'discover', label: '发现', to: '/category', icon: ContentCategory },
  { key: 'mine', label: '我的', to: '/profile', icon: SystemUser },
];

export function BottomTabBar() {
  return (
    <nav
      className="bottom-tab-bar"
      role="navigation"
      aria-label="底部主导航"
    >
      <ul className="bottom-tab-bar__list">
        {TABS.map(({ key, label, to, icon: IconCmp, end }) => (
          <li key={key} className="bottom-tab-bar__item">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `bottom-tab-bar__link${isActive ? ' is-active' : ''}`
              }
              aria-label={label}
            >
              <IconCmp size="md" />
              <span className="bottom-tab-bar__label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
