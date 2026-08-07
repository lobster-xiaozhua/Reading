/* ============================================================
 * routePrefetchRegistry · C 端路由速通注册表
 * 集中定义各路由的 chunk 加载器与数据预取器，
 * 供 router.tsx 在启动时与空闲时调用。
 * ============================================================ */

import { registerRoutePrefetch, prefetchAllOnIdle } from "@/utils/routePrefetch";
import { fetcher } from "@/api/fetcher";

/** 各路由的 chunk 懒加载器（与 router.tsx 中的 lazy import 一致） */
const chunkLoaders = {
  discover: () => import("@/pages/DiscoverPage"),
  bookDetail: () => import("@/pages/BookDetailPage"),
  reader: () => import("@/pages/ReaderPage"),
  category: () => import("@/pages/CategoryPage"),
  search: () => import("@/pages/SearchPage"),
  profile: () => import("@/pages/ProfilePage"),
  stats: () => import("@/pages/ReadingStatsPage"),
  vip: () => import("@/pages/VipPage"),
  follow: () => import("@/pages/FollowPage"),
  login: () => import("@/pages/LoginPage"),
  notFound: () => import("@/pages/NotFoundPage"),
};

/** 各路由的数据预取器 */
const dataPrefetchers = {
  discover: () => fetcher.getDiscoverHome(),
  bookDetail: (bookId: string) => fetcher.getBookDetail(bookId),
  category: () =>
    Promise.allSettled([fetcher.getCategories(), fetcher.getTags()]),
  search: () => fetcher.getHotSearches(),
  profile: () => fetcher.getCurrentUser(),
  stats: () => fetcher.getReadingStatOverview(),
  vip: () => fetcher.getVipPlans(),
  follow: () => fetcher.getFollowList(),
};

/** 注册全部路由的速通策略 */
export function initRoutePrefetch(): void {
  // 公开路由（未登录也可预取）
  registerRoutePrefetch("/discover", {
    chunk: chunkLoaders.discover,
    data: dataPrefetchers.discover,
  });
  registerRoutePrefetch("/category", {
    chunk: chunkLoaders.category,
    data: dataPrefetchers.category,
  });
  registerRoutePrefetch("/search", {
    chunk: chunkLoaders.search,
    data: dataPrefetchers.search,
  });
  registerRoutePrefetch("/vip", {
    chunk: chunkLoaders.vip,
    data: dataPrefetchers.vip,
  });
  // 书籍详情无法静态预取（依赖 bookId），仅预取 chunk
  registerRoutePrefetch("/book/:bookId", {
    chunk: chunkLoaders.bookDetail,
  });
  // 阅读器 chunk 预取（进入阅读前的等待最小化）
  registerRoutePrefetch("/read/:bookId/:chapterId?", {
    chunk: chunkLoaders.reader,
  });

  // 登录后才访问的路由（已登录才预取）
  registerRoutePrefetch("/profile", {
    authed: true,
    chunk: chunkLoaders.profile,
    data: dataPrefetchers.profile,
  });
  registerRoutePrefetch("/stats", {
    authed: true,
    chunk: chunkLoaders.stats,
    data: dataPrefetchers.stats,
  });
  registerRoutePrefetch("/follow", {
    authed: true,
    chunk: chunkLoaders.follow,
    data: dataPrefetchers.follow,
  });

  // 首屏呈现后，空闲时预取全部高概率路由
  prefetchAllOnIdle();
}

export { hoverPrefetch, prefetchRoute } from "@/utils/routePrefetch";