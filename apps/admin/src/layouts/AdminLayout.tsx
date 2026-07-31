/* ============================================================
 * P0-7 · B 端主布局占位（P1 阶段细化）
 * 当前仅渲染 Outlet，P1 阶段替换为完整 Sider/Header/Tabs/Content 布局
 * ============================================================ */

import { Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div className="admin-layout">
      <a href="#main-content" className="skip-link">
        跳到主内容
      </a>
      {/* P1 阶段替换为完整布局：<AdminSider /><AdminHeader /><AdminTabs /><AdminContent /> */}
      <main id="main-content" style={{ flex: 1, padding: 'var(--space-6)' }} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
