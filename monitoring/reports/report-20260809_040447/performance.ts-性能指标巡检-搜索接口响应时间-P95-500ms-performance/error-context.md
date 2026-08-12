# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: performance.ts >> 性能指标巡检 >> 搜索接口响应时间 P95 < 500ms
- Location: monitoring/checks/performance.ts:6:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const BACKEND = 'http://localhost:8000';
  4  | 
  5  | test.describe('性能指标巡检', () => {
  6  |   test('搜索接口响应时间 P95 < 500ms', async ({ request }) => {
  7  |     const times: number[] = [];
  8  |     for (let i = 0; i < 20; i++) {
  9  |       const start = Date.now();
  10 |       const res = await request.get(`${BACKEND}/api/v1/c/search/books`, {
  11 |         params: { keyword: 'test', page: 1, page_size: 12 },
  12 |       });
  13 |       times.push(Date.now() - start);
> 14 |       expect(res.ok()).toBeTruthy();
     |                        ^ Error: expect(received).toBeTruthy()
  15 |     }
  16 |     times.sort((a, b) => a - b);
  17 |     // 20 样本的 P95 = 第 19 个（索引 18），即 95% 分位
  18 |     const idx = Math.floor((times.length - 1) * 0.95);
  19 |     const p95 = times[idx] ?? times[times.length - 1]!;
  20 |     expect(p95).toBeLessThan(500);
  21 |   });
  22 | 
  23 |   test('首页发现页接口响应时间 < 300ms', async ({ request }) => {
  24 |     const start = Date.now();
  25 |     const res = await request.get(`${BACKEND}/api/v1/c/discovery/home`);
  26 |     const duration = Date.now() - start;
  27 |     expect(res.ok()).toBeTruthy();
  28 |     expect(duration).toBeLessThan(300);
  29 |   });
  30 | 
  31 |   test('书籍列表接口响应时间 < 300ms', async ({ request }) => {
  32 |     const start = Date.now();
  33 |     const res = await request.get(`${BACKEND}/api/v1/c/books`, {
  34 |       params: { page: 1, page_size: 20 },
  35 |     });
  36 |     const duration = Date.now() - start;
  37 |     expect(res.ok()).toBeTruthy();
  38 |     expect(duration).toBeLessThan(300);
  39 |   });
  40 | 
  41 |   test('C 端首页首屏加载 LCP 候选', async ({ page }) => {
  42 |     const start = Date.now();
  43 |     await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  44 |     const domReady = Date.now() - start;
  45 |     expect(domReady).toBeLessThan(5000);
  46 |   });
  47 | 
  48 |   test('B 端登录页首屏加载', async ({ page }) => {
  49 |     const start = Date.now();
  50 |     await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
  51 |     const domReady = Date.now() - start;
  52 |     expect(domReady).toBeLessThan(5000);
  53 |   });
  54 | });
```