/* ============================================================
 * routePrefetch · B 端路由速通系统
 * 与 C 端共用同一套速通策略：空闲预加载 + 悬停预加载。
 * B 端登录后才能访问，因此所有业务路由均标记 authed。
 * ============================================================ */

/** 已注册的预加载路由表 */
const prefetchRegistry: Record<
  string,
  { authed?: boolean; chunk?: () => Promise<unknown> }
> = {};

/** 已完成 chunk 预加载的路由 */
const prefetchedChunks = new Set<string>();

/** 是否已启动空闲预加载 */
let idleStarted = false;

/** 是否已登录（从 localStorage 读取 token） */
function isAuthed(): boolean {
  try {
    const raw = localStorage.getItem("atlas-admin-auth");
    if (!raw) return false;
    return Boolean(JSON.parse(raw).state?.token);
  } catch {
    return false;
  }
}

/** 注册一条路由的速通配置 */
export function registerRoutePrefetch(
  path: string,
  config: { chunk: () => Promise<unknown> },
): void {
  prefetchRegistry[path] = { ...config, authed: true };
}

/** 预加载单个路由 */
export function prefetchRoute(path: string): void {
  const config = prefetchRegistry[path];
  if (!config) return;
  if (config.authed && !isAuthed()) return;
  if (config.chunk && !prefetchedChunks.has(path)) {
    prefetchedChunks.add(path);
    config.chunk().catch(() => {
      prefetchedChunks.delete(path);
    });
  }
}

/** 空闲时预加载全部业务路由 */
export function prefetchAllOnIdle(): void {
  if (idleStarted) return;
  idleStarted = true;
  const run = () => {
    for (const path of Object.keys(prefetchRegistry)) {
      prefetchRoute(path);
    }
  };
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1500);
  }
}

/** 悬停预加载处理器 */
export function hoverPrefetch(path: string) {
  return () => prefetchRoute(path);
}

/** 重置（测试用） */
export function resetRoutePrefetch(): void {
  prefetchedChunks.clear();
  idleStarted = false;
}