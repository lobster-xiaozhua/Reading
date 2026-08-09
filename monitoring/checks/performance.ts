import { test, expect } from '@playwright/test';

const BACKEND = 'http://localhost:8000';
const IS_DEV = process.env.DEBUG === 'true';

// 阈值说明：dev 模式（DEBUG=true，vite dev + SQLite + 首次冷启动）下放宽；
// 生产构建（gunicorn + MySQL + Redis 缓存）下应显著更优。
const SEARCH_P95 = IS_DEV ? 2000 : 500;
const PAGE_DOM_READY = IS_DEV ? 15_000 : 5_000;

test.describe('性能指标巡检', () => {
  test('搜索接口响应时间 P95', async ({ request }) => {
    // 搜索接口限流 10 次/分钟，采样 8 次避免触发 429
    const times: number[] = [];
    for (let i = 0; i < 8; i++) {
      const start = Date.now();
      const res = await request.get(`${BACKEND}/api/v1/c/search/books`, {
        params: { keyword: 'test', page: 1, page_size: 12 },
      });
      times.push(Date.now() - start);
      expect(res.ok()).toBeTruthy();
    }
    times.sort((a, b) => a - b);
    // 8 样本的 P95 ≈ 索引 7（最大值）
    const idx = Math.floor((times.length - 1) * 0.95);
    const p95 = times[idx] ?? times[times.length - 1]!;
    expect(p95).toBeLessThan(SEARCH_P95);
  });

  test('首页发现页接口响应时间 < 300ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BACKEND}/api/v1/c/discovery/home`);
    const duration = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(duration).toBeLessThan(300);
  });

  test('书籍列表接口响应时间 < 300ms', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BACKEND}/api/v1/c/books`, {
      params: { page: 1, page_size: 20 },
    });
    const duration = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(duration).toBeLessThan(300);
  });

  test('C 端首页首屏加载 LCP 候选', async ({ page }) => {
    test.setTimeout(60_000);
    const start = Date.now();
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    const domReady = Date.now() - start;
    expect(domReady).toBeLessThan(PAGE_DOM_READY);
  });

  test('B 端登录页首屏加载', async ({ page }) => {
    test.setTimeout(60_000);
    const start = Date.now();
    await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
    const domReady = Date.now() - start;
    expect(domReady).toBeLessThan(PAGE_DOM_READY);
  });
});