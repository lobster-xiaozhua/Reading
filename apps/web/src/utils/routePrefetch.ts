/* ============================================================
 * routePrefetch · 路由速通系统
 * 核心思想：在用户真正需要之前，把"下一步最可能访问"的
 * 路由 chunk 与数据提前加载好，让导航实现"零等待"。
 *
 * 策略：
 *  1. 空闲预加载（requestIdleCallback）— 首屏渲染后，趁空闲
 *     预取高概率路由 chunk 与数据。
 *  2. 悬停预加载（onPointerEnter）— 用户鼠标悬停到链接时，
 *     立即预取目标路由 chunk；进入可点击区域前已就绪。
 *  3. 已登录预取 — 已登录用户预取个人中心/书架等私有路由。
 * ============================================================ */

/** 路由 chunk 预加载器：返回一个 Promise */
type ChunkLoader = () => Promise<unknown>;

/** 路由数据预取器：返回一个 Promise */
type DataPrefetcher = () => Promise<unknown>;

/** 路由预加载配置 */
interface RoutePrefetchConfig {
  /** 登录后才会访问的路由（已登录才预取） */
  authed?: boolean;
  /** JS chunk 加载器 */
  chunk?: ChunkLoader;
  /** 数据预取器 */
  data?: DataPrefetcher;
}

/** 已注册的预加载路由表 */
const prefetchRegistry: Record<string, RoutePrefetchConfig> = {};

/** 已完成 chunk 预加载的路由（避免重复） */
const prefetchedChunks = new Set<string>();
/** 已完成数据预取的路由 */
const prefetchedData = new Set<string>();

/** 是否已启动空闲预加载 */
let idleStarted = false;

/**
 * 注册一条路由的预加载策略。
 * @param path 路由路径（可用作 key，如 "/profile"）
 * @param config 预加载配置
 */
export function registerRoutePrefetch(
  path: string,
  config: RoutePrefetchConfig,
): void {
  prefetchRegistry[path] = config;
}

/** 是否已登录（从 localStorage 读取 token） */
function isAuthed(): boolean {
  try {
    const raw = localStorage.getItem("atlas-store");
    if (!raw) return false;
    return Boolean(JSON.parse(raw).state?.token);
  } catch {
    return false;
  }
}

/** 预加载单个路由 */
export function prefetchRoute(path: string): void {
  const config = prefetchRegistry[path];
  if (!config) return;
  // 已登录才预取的路由，未登录跳过
  if (config.authed && !isAuthed()) return;

  // 预加载 JS chunk（幂等：只加载一次）
  if (config.chunk && !prefetchedChunks.has(path)) {
    prefetchedChunks.add(path);
    config.chunk().catch(() => {
      // 预加载失败静默忽略，下次可重试
      prefetchedChunks.delete(path);
    });
  }

  // 预取数据（幂等：只取一次）
  if (config.data && !prefetchedData.has(path)) {
    prefetchedData.add(path);
    config.data().catch(() => {
      // 数据预取失败静默忽略
      prefetchedData.delete(path);
    });
  }
}

/** 空闲时预加载所有高概率路由 */
export function prefetchAllOnIdle(): void {
  if (idleStarted) return;
  idleStarted = true;

  const run = () => {
    // 按注册顺序预加载（登录态路由排后）
    const paths = Object.keys(prefetchRegistry).sort(
      (a, b) => {
        const ca = prefetchRegistry[a];
        const cb = prefetchRegistry[b];
        return Number(ca?.authed) - Number(cb?.authed);
      },
    );
    for (const path of paths) {
      prefetchRoute(path);
    }
  };

  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1500);
  }
}

/**
 * 悬停预加载：返回 onMouseEnter 处理器，绑定到 Link 上。
 * 鼠标进入链接区域即预取目标路由，通常比点击早 100-300ms。
 */
export function hoverPrefetch(path: string) {
  return () => prefetchRoute(path);
}

/** 重置（测试用） */
export function resetRoutePrefetch(): void {
  prefetchedChunks.clear();
  prefetchedData.clear();
  idleStarted = false;
}