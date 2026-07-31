// 云笈阁 Service Worker — 分层缓存策略，支持完整离线阅读
const CACHE_VERSION = "yunjige-v2";
const CACHES = {
  static: `${CACHE_VERSION}-static`,   // 静态资源（JS/CSS/字体）
  appShell: `${CACHE_VERSION}-shell`,   // 应用壳（HTML）
  reader: `${CACHE_VERSION}-reader`,    // 阅读器离线内容
  cover: `${CACHE_VERSION}-cover`,      // 封面图片
};

// 安装时预缓存的关键资源
const PRECACHE_STATIC = [
  "/",
  "/index.html",
];

// 字体 CDN 域名列表
const FONT_ORIGINS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

// 安装：预缓存应用壳
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHES.appShell);
      await cache.addAll(PRECACHE_STATIC);
      await self.skipWaiting();
    })()
  );
});

// 激活：清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("yunjige-") && !Object.values(CACHES).includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// 接收主线程消息
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 请求拦截
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // === 1. API 请求：网络优先，永不缓存 ===
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // === 2. 非 GET 请求：跳过 ===
  if (event.request.method !== "GET") {
    return;
  }

  // === 3. 字体文件：缓存优先（长期不变） ===
  if (FONT_ORIGINS.includes(url.hostname)) {
    event.respondWith(cacheFirst(event.request, CACHES.static));
    return;
  }

  // === 4. 封面图片：缓存优先，后台更新 ===
  if (url.pathname.startsWith("/api/cover/")) {
    event.respondWith(staleWhileRevalidate(event.request, CACHES.cover));
    return;
  }

  // === 5. Vite 构建产物（带 hash 的 JS/CSS）：缓存优先 ===
  if (url.pathname.match(/\/assets\/.*\.[a-f0-9]{8}\./)) {
    event.respondWith(cacheFirst(event.request, CACHES.static));
    return;
  }

  // === 6. manifest / icons / sw：缓存优先 ===
  if (url.pathname === "/manifest.json" || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(event.request, CACHES.static));
    return;
  }

  // === 7. 导航请求（SPA 路由）：网络优先，离线回退到首页 ===
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, CACHES.appShell));
    return;
  }

  // === 8. 其他静态资源：缓存优先 ===
  event.respondWith(cacheFirst(event.request, CACHES.static));
});

/**
 * 缓存优先策略：先查缓存，未命中则发起网络请求并缓存
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // 对图片请求返回占位图
    if (request.destination === "image") {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="260" viewBox="0 0 200 260"><rect fill="#131a2e" width="200" height="260" rx="8"/><text x="100" y="130" text-anchor="middle" fill="#5a5766" font-size="40" font-family="sans-serif">📚</text></svg>',
        { headers: { "Content-Type": "image/svg+xml" } }
      );
    }
    throw error;
  }
}

/**
 * 网络优先策略：先尝试网络，失败时使用缓存
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // 导航请求离线时回退到首页
    if (request.mode === "navigate") {
      const fallback = await caches.match("/");
      if (fallback) return fallback;
    }

    return new Response(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>离线 · 云笈阁</title><style>body{background:#0a0e17;color:#e8e4dc;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center;padding:20px}h1{font-size:24px;color:#3b82f6}p{color:#8a8796;margin:8px 0}.retry-btn{margin-top:20px;padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer}</style></head><body><h1>📖 云笈阁</h1><p>当前处于离线状态</p><p style="font-size:13px">已缓存的书籍仍可阅读</p><button class="retry-btn" onclick="location.reload()">重试连接</button></body></html>`,
      { headers: { "Content-Type": "text/html;charset=UTF-8" } }
    );
  }
}

/**
 * Stale-while-revalidate：先返回缓存，后台发起网络请求更新缓存
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // 先返回缓存（如果有）
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}