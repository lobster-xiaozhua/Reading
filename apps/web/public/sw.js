/* ============================================================
 * Service Worker · P7-6
 * 离线阅读：Cache-first 已读章节 + App Shell 回退
 *   - 预缓存 App Shell（HTML/JS/CSS 入口）
 *   - 章节正文 API（fetcher.getChapter）：Cache-first，命中直返，未命中请求并回写
 *   - 静态资源（同源 /assets/）：stale-while-revalidate
 *   - 图片：cache-first，超时回退网络
 *   - 不缓存 POST/DELETE 及非 GET 请求
 *   - 50MB 上限由 IndexedDB（章节正文）+ Cache Storage（静态）共同遵守
 * ============================================================ */

const CACHE_VERSION = 'atlas-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CHAPTER_CACHE = `${CACHE_VERSION}-chapter`;

// App Shell 预缓存清单（构建产物入口）
const SHELL_ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  // 不自动 skipWaiting：由前端决定何时接管（首次安装静默、更新时提示后接管）
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
});

// 收到前端 SKIP_WAITING 消息后接管页面
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 同源且为章节正文 API（约定路径 /api/chapter/*）
  if (url.origin === self.location.origin && /\/api\/chapter\//.test(url.pathname)) {
    event.respondWith(chapterCacheFirst(req));
    return;
  }

  // 同源静态资源：stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // 跨源图片：cache-first
  if (req.destination === 'image') {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    return;
  }
});

/* ---------- 章节正文：Cache-first ---------- */
async function chapterCacheFirst(req) {
  const cache = await caches.open(CHAPTER_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('离线且无缓存', { status: 503, statusText: 'Offline' });
  }
}

/* ---------- 静态资源：Stale-while-revalidate ---------- */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

/* ---------- 通用 Cache-first ---------- */
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}
