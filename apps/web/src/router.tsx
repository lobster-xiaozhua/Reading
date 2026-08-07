import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { ReaderLayout } from "./layouts/ReaderLayout";
import { PageLoading } from "./components/PageLoading";
import { initRoutePrefetch } from "./utils/routePrefetchRegistry";

// 路由级代码分割：首屏仅加载当前页 chunk
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const BookDetailPage = lazy(() => import("./pages/BookDetailPage"));
const ReaderPage = lazy(() => import("./pages/ReaderPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ReadingStatsPage = lazy(() => import("./pages/ReadingStatsPage"));
const VipPage = lazy(() => import("./pages/VipPage"));
const FollowPage = lazy(() => import("./pages/FollowPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const isDev = import.meta.env.DEV;

const withSuspense = (node: React.ReactNode) => {
  if (isDev) {
    const name = (node as React.ReactElement)?.type?.toString().slice(0, 20);
    performance.mark(`route:${name ?? "unknown"}:start`);
  }
  return <Suspense fallback={<PageLoading />}>{node}</Suspense>;
};

export const router: ReturnType<typeof createBrowserRouter> =
  createBrowserRouter([
    {
      path: "/",
      element: <AppLayout />,
      children: [
        { index: true, element: withSuspense(<DiscoverPage />) },
        { path: "book/:bookId", element: withSuspense(<BookDetailPage />) },
        { path: "category", element: withSuspense(<CategoryPage />) },
        { path: "search", element: withSuspense(<SearchPage />) },
        { path: "profile", element: withSuspense(<ProfilePage />) },
        { path: "stats", element: withSuspense(<ReadingStatsPage />) },
        { path: "vip", element: withSuspense(<VipPage />) },
        { path: "follow", element: withSuspense(<FollowPage />) },
      ],
    },
    // 阅读器独立全屏布局，不带 NavBar/Footer
    {
      path: "/read/:bookId/:chapterId?",
      element: <ReaderLayout />,
      children: [{ index: true, element: withSuspense(<ReaderPage />) }],
    },
{ path: "/login", element: withSuspense(<LoginPage />) },
  { path: "/404", element: withSuspense(<NotFoundPage />) },
  { path: "*", element: <Navigate to="/404" replace /> },
]);

// 路由速通：注册预加载策略，空闲时预取高概率路由
initRoutePrefetch();
