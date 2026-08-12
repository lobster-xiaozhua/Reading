# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: performance.ts >> 性能指标巡检 >> B 端登录页首屏加载
- Location: monitoring/checks/performance.ts:48:7

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 5000
Received:   7334
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - heading "Atlas 小说管理平台" [level=1] [ref=e10]
    - paragraph [ref=e11]: 一体化作品管理、内容审核与数据运营中枢
    - list [ref=e12]:
      - listitem [ref=e13]:
        - generic [ref=e17]: 多维度经营数据看板
      - listitem [ref=e18]:
        - generic [ref=e22]: 全流程内容审核工作台
      - listitem [ref=e23]:
        - generic [ref=e27]: 细粒度角色与权限体系
  - generic [ref=e30]:
    - generic [ref=e31]:
      - heading "Atlas 运营后台" [level=3] [ref=e32]
      - text: 小说运营管理系统
    - generic [ref=e33]:
      - generic [ref=e35]:
        - generic "用户名" [ref=e37]
        - generic [ref=e41]:
          - img "user" [ref=e43]
          - textbox "用户名" [ref=e46]:
            - /placeholder: 请输入用户名
      - generic [ref=e48]:
        - generic "密码" [ref=e50]
        - generic [ref=e54]:
          - img "lock" [ref=e56]
          - textbox "密码" [ref=e59]:
            - /placeholder: 请输入密码
          - img "eye-invisible" [ref=e61] [cursor=pointer]
      - generic [ref=e70] [cursor=pointer]:
        - checkbox "记住我（7 天免登录）" [checked] [ref=e72]
        - generic [ref=e74]: 记住我（7 天免登录）
      - button "登 录" [ref=e80] [cursor=pointer]
    - generic [ref=e82]:
      - generic [ref=e83]: 演示账号（P6 多角色）：
      - generic [ref=e84]:
        - generic [ref=e85]:
          - generic [ref=e86]: "管理员: admin / admin123"
          - generic [ref=e87] [cursor=pointer]: 一键填充
        - generic [ref=e88]:
          - generic [ref=e89]: "内容管理员: content / content123"
          - generic [ref=e90] [cursor=pointer]: 一键填充
        - generic [ref=e91]:
          - generic [ref=e92]: "审核员: auditor / auditor123"
          - generic [ref=e93] [cursor=pointer]: 一键填充
        - generic [ref=e94]:
          - generic [ref=e95]: "运营: operation / operation123"
          - generic [ref=e96] [cursor=pointer]: 一键填充
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
  14 |       expect(res.ok()).toBeTruthy();
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
> 52 |     expect(domReady).toBeLessThan(5000);
     |                      ^ Error: expect(received).toBeLessThan(expected)
  53 |   });
  54 | });
```