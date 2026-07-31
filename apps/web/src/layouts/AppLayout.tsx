import { Outlet } from 'react-router-dom';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';

/**
 * 应用主布局
 * - 顶部 NavBar（含 Logo/搜索/分类/登录）
 * - 主内容区（路由出口）
 * - 底部 Footer
 * - 阅读器页走独立 ReaderLayout，不进入此布局
 */
export function AppLayout() {
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        跳到主内容
      </a>
      <NavBar />
      <main id="main-content" className="app-layout__main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
