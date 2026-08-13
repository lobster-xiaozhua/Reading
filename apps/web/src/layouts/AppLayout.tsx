import { Outlet, useLocation } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { BottomTabBar } from "@/components/BottomTabBar";

/**
 * 应用主布局
 * - 顶部 NavBar（含 Logo/搜索/分类/登录）
 * - 主内容区（路由出口 + 页面淡入过渡）
 * - 底部 Footer（桌面端）+ BottomTabBar（H5，P7-1）
 * - 阅读器页走独立 ReaderLayout，不进入此布局
 */
export function AppLayout() {
  const location = useLocation();
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        跳到主内容
      </a>
      <NavBar />
      <main id="main-content" className="app-layout__main" tabIndex={-1}>
        <div key={location.pathname} className="page-fade-in">
          <Outlet />
        </div>
      </main>
      <Footer />
      {/* P7-1 H5 底部 4 Tab 导航；阅读器全屏路由不进入此布局 */}
      <BottomTabBar />
    </div>
  );
}
