/* ============================================================
 * routePrefetchRegistry · B 端路由速通注册表
 * 集中注册各业务路由的 chunk 预加载器，登录后空闲预加载。
 * ============================================================ */

import { registerRoutePrefetch, prefetchAllOnIdle } from "./routePrefetch";

/** 各业务路由的 chunk 懒加载器（与 router.tsx 一致） */
const chunkLoaders = {
  workbench: () => import("@/pages/WorkbenchPage"),
  novelList: () => import("@/pages/NovelListPage"),
  novelDetail: () => import("@/pages/NovelDetailPage"),
  novelForm: () => import("@/pages/NovelFormPage"),
  chapterList: () => import("@/pages/ChapterListPage"),
  audit: () => import("@/pages/AuditWorkbenchPage"),
  charts: () => import("@/pages/ChartsShowcasePage"),
  royalty: () => import("@/pages/RoyaltyPage"),
  permission: () => import("@/pages/PermissionPage"),
  user: () => import("@/pages/UserListPage"),
  system: () => import("@/pages/SystemConfigPage"),
};

/** 注册全部 B 端路由的速通策略 */
export function initRoutePrefetch(): void {
  registerRoutePrefetch("/workbench", { chunk: chunkLoaders.workbench });
  registerRoutePrefetch("/novel", { chunk: chunkLoaders.novelList });
  registerRoutePrefetch("/novel/create", { chunk: chunkLoaders.novelForm });
  registerRoutePrefetch("/novel/:novelId", {
    chunk: chunkLoaders.novelDetail,
  });
  registerRoutePrefetch("/novel/:novelId/edit", {
    chunk: chunkLoaders.novelForm,
  });
  registerRoutePrefetch("/chapter/:novelId", {
    chunk: chunkLoaders.chapterList,
  });
  registerRoutePrefetch("/audit", { chunk: chunkLoaders.audit });
  registerRoutePrefetch("/charts", { chunk: chunkLoaders.charts });
  registerRoutePrefetch("/royalty", { chunk: chunkLoaders.royalty });
  registerRoutePrefetch("/permission", { chunk: chunkLoaders.permission });
  registerRoutePrefetch("/user", { chunk: chunkLoaders.user });
  registerRoutePrefetch("/system", { chunk: chunkLoaders.system });

  // 登录后空闲时预取全部业务路由
  prefetchAllOnIdle();
}

export { hoverPrefetch, prefetchRoute } from "./routePrefetch";