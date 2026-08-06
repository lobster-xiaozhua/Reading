import { test, expect } from '@playwright/test';

const BACKEND = 'http://localhost:8000';

test.describe('性能指标巡检', () => {
  test('搜索接口响应时间 P95 < 500ms', async ({ request }) => {
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      const res = await request.get(`${BACKEND}/api/v1/c/search/books`, {
        params: { keyword: 'test', page: 1, page_size: 12 },
      });
      times.push(Date.now() - start);
      expect(res.ok()).toBeTruthy();
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(500);
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
    const start = Date.now();
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    const domReady = Date.now() - start;
    expect(domReady).toBeLessThan(5000);
  });

  test('B 端登录页首屏加载', async ({ page }) => {
    const start = Date.now();
    await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
    const domReady = Date.now() - start;
    expect(domReady).toBeLessThan(5000);
  });
});