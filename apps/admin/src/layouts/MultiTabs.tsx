/* ============================================================
 * P1-5 · 多 Tab 标签页 MultiTabs
 * 高 40px；宽 120-200px；首页不可关闭；右键菜单（关闭其他/左侧/右侧/全部）
 * 刷新后保留（tabStore persist）
 * 04 §8.5
 * ============================================================ */

import { useEffect, useMemo } from 'react';
import { Tabs, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabStore } from '@/stores/tabStore';
import { menuConfig, HOME_TAB_KEY } from './menu-config';

/** 从路径解析 Tab label */
function resolveLabel(pathname: string): string {
  // 首页
  if (pathname === '/workbench' || pathname === '/') return '工作台';
  // 顶层
  for (const item of menuConfig) {
    if (item.path === pathname) return item.label;
  }
  // 二级
  for (const parent of menuConfig) {
    if (!parent.children) continue;
    for (const child of parent.children) {
      if (child.path && pathname.startsWith(child.path)) return child.label;
    }
  }
  // 未匹配（如详情页 /novel/:id）：取最近菜单名 + 「详情」
  for (const parent of menuConfig) {
    if (!parent.children) continue;
    for (const child of parent.children) {
      if (child.path && pathname.includes(child.path)) return `${child.label}详情`;
    }
  }
  return '未命名';
}

export function MultiTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tabs, activeKey, addTab, closeTab, closeOthers, closeLeft, closeRight, closeAll, setActive } =
    useTabStore();

  // 监听路由变化，自动同步 Tab
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/404') return;
    const label = resolveLabel(path);
    addTab({ key: path, label, closable: path !== `/${HOME_TAB_KEY}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const items = useMemo(
    () =>
      tabs.map((t) => ({
        key: t.key,
        label: t.label,
        closable: t.closable,
      })),
    [tabs],
  );

  const handleChange = (key: string) => {
    setActive(key);
    navigate(key);
  };

  const handleRemove = (key: string) => {
    closeTab(key);
    // closeTab 内部会算出下一个 activeKey，导航过去
    const next = useTabStore.getState().activeKey;
    if (next !== key) navigate(next);
  };

  /** 右键菜单项 */
  const buildContextMenu = (targetKey: string): MenuProps => ({
    items: [
      { key: 'closeOthers', label: '关闭其他', disabled: tabs.length <= 1 },
      { key: 'closeLeft', label: '关闭左侧', disabled: tabs.findIndex((t) => t.key === targetKey) === 0 },
      {
        key: 'closeRight',
        label: '关闭右侧',
        disabled: tabs.findIndex((t) => t.key === targetKey) === tabs.length - 1,
      },
      { key: 'closeAll', label: '关闭全部' },
    ],
    onClick: (info) => {
      switch (info.key) {
        case 'closeOthers':
          closeOthers(targetKey);
          navigate(targetKey);
          break;
        case 'closeLeft':
          closeLeft(targetKey);
          break;
        case 'closeRight':
          closeRight(targetKey);
          break;
        case 'closeAll':
          closeAll();
          navigate(`/${HOME_TAB_KEY}`);
          break;
      }
    },
  });

  // 为每个 Tab 渲染带右键菜单的 label
  const renderTabBar: TabsPropsRenderTabBar = (props, DefaultTabBar) => (
    <DefaultTabBar {...props}>
      {(node: { key?: string; label?: React.ReactNode }) => (
        <Dropdown menu={buildContextMenu(node.key as string)} trigger={['contextMenu']}>
          <span>{node.label}</span>
        </Dropdown>
      )}
    </DefaultTabBar>
  );

  return (
    <div className="bend-tabs" role="tablist" aria-label="页面标签">
      <Tabs
        type="card"
        size="small"
        hideAdd
        onChange={handleChange}
        activeKey={activeKey}
        items={items}
        onEdit={(targetKey, action) => {
          if (action === 'remove') handleRemove(targetKey as string);
        }}
        renderTabBar={renderTabBar as never}
      />
    </div>
  );
}

/** renderTabBar 类型别名（避免直接依赖 antd 内部类型） */
type TabsPropsRenderTabBar = (
  props: Record<string, unknown>,
  DefaultTabBar: React.ComponentType<Record<string, unknown>>,
) => React.ReactNode;
