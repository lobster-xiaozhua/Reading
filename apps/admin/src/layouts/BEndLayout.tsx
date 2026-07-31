/* ============================================================
 * P1-1 / P1-2 / P1-6 · B 端整体布局
 * - Sider 240（折叠 80） + Header 64 + Tabs 40 + Content max 1440 / padding 24
 * - 最小宽度 1280px，低于此横向滚动（不适配移动端，04 §1.3）
 * - 内容区栅格 12 列 / gap 16 / 最大宽 1440px
 * 04 §8.1 / §8.2 / §8.6
 * ============================================================ */

import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { SiderMenu } from './SiderMenu';
import { HeaderBar } from './HeaderBar';
import { MultiTabs } from './MultiTabs';
import './bend-layout.css';

const { Content } = Layout;

export function BEndLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bend-shell">
      <a href="#main-content" className="skip-link">
        跳到主内容
      </a>
      <Layout className="bend-layout">
        <SiderMenu collapsed={collapsed} />
        <Layout className="bend-layout__main">
          <HeaderBar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
          <MultiTabs />
          <Content
            id="main-content"
            className="bend-layout__content"
            tabIndex={-1}
            style={{
              background: 'var(--color-bg-page)',
              padding: 'var(--space-6)',
            }}
          >
            <div className="bend-layout__inner">
              <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </div>
  );
}
