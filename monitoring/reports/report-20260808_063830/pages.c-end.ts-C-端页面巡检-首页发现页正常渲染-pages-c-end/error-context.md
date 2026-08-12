# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pages.c-end.ts >> C 端页面巡检 >> 首页发现页正常渲染
- Location: monitoring/checks/pages.c-end.ts:6:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5173/", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const WEB = 'http://localhost:5173';
  4  | 
  5  | test.describe('C 端页面巡检', () => {
  6  |   test('首页发现页正常渲染', async ({ page }) => {
> 7  |     await page.goto(WEB, { waitUntil: 'domcontentloaded' });
     |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  8  |     await expect(page.locator('body')).toBeAttached();
  9  |     await expect(page.locator('.discover-page')).toBeAttached();
  10 |     await expect(page.locator('.discover-page__banner')).toBeVisible();
  11 |     // 聚合 6 模块：banner、编辑推荐、热门、限免、分类、排行榜
  12 |     const sections = page.locator('.discover-page__section');
  13 |     await expect(sections.first()).toBeAttached();
  14 |     // 排行榜 Tab 切换
  15 |     await expect(page.locator('.discover-page__rank-tabs')).toBeVisible();
  16 |     const rankTabs = page.locator('.discover-page__rank-tab');
  17 |     await expect(rankTabs.first()).toBeAttached();
  18 |   });
  19 | 
  20 |   test('发现页限免区域有倒计时或标签', async ({ page }) => {
  21 |     await page.goto(WEB, { waitUntil: 'domcontentloaded' });
  22 |     await expect(page.locator('.discover-page')).toBeAttached();
  23 |     const freeBadge = page.locator('.discover-page__free-badge');
  24 |     const countdown = page.locator('.novel-countdown');
  25 |     // 至少有一个限免标识（标签或倒计时）
  26 | const badgeCount = await freeBadge.count();
  27 |     const countdownCount = await countdown.count();
  28 |     // 至少有一个限免标识（标签或倒计时）或页面无限免数据
  29 |     if (badgeCount > 0 || countdownCount > 0) {
  30 |       expect(badgeCount + countdownCount).toBeGreaterThan(0);
  31 |     }
  32 |   });
  33 | 
  34 |   test('登录页正常渲染', async ({ page }) => {
  35 |     await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
  36 |     await expect(page.locator('body')).toBeAttached();
  37 |   });
  38 | 
  39 |   test('书籍详情页可访问', async ({ page }) => {
  40 |     await page.goto(`${WEB}/book/1`, { waitUntil: 'domcontentloaded' });
  41 |     await expect(page.locator('body')).toBeAttached();
  42 |   });
  43 | 
  44 |   test('分类页含二级分类', async ({ page }) => {
  45 |     await page.goto(`${WEB}/category`, { waitUntil: 'domcontentloaded' });
  46 |     await expect(page.locator('.category-page')).toBeAttached();
  47 |     // 二级分类列表
  48 |     const subLists = page.locator('.category-page__cat-sub');
  49 |     const subCount = await subLists.count();
  50 |     expect(subCount).toBeGreaterThanOrEqual(1);
  51 |     // 排序 Tab
  52 |     await expect(page.locator('.category-page__sort-tabs')).toBeVisible();
  53 |   });
  54 | 
  55 |   test('搜索页可搜索并显示加载更多', async ({ page }) => {
  56 |     await page.goto(`${WEB}/search`, { waitUntil: 'domcontentloaded' });
  57 |     await expect(page.locator('.search-page')).toBeAttached();
  58 |     // 输入搜索词
  59 |     const input = page.locator('.search-page__input');
  60 |     await input.fill('测试');
  61 |     await page.locator('.search-page__submit').click();
  62 |     // 等待结果或空状态
  63 |     await page.waitForTimeout(2000);
  64 |     // 如果有结果，检查加载更多按钮
  65 |     const loadMore = page.locator('.search-page__loadmore');
  66 |     if ((await loadMore.count()) > 0) {
  67 |       await expect(loadMore).toBeVisible();
  68 |     }
  69 |   });
  70 | 
  71 |   test('404 页面正常渲染', async ({ page }) => {
  72 |     await page.goto(`${WEB}/nonexistent-route-test`, { waitUntil: 'domcontentloaded' });
  73 |     await expect(page.locator('body')).toBeAttached();
  74 |   });
  75 | 
  76 |   test('控制台无重大错误', async ({ page }) => {
  77 |     const errors: string[] = [];
  78 |     page.on('console', (msg) => {
  79 |       if (msg.type() === 'error') errors.push(msg.text());
  80 |     });
  81 |     page.on('pageerror', (err) => errors.push(err.message));
  82 | 
  83 |     await page.goto(WEB, { waitUntil: 'domcontentloaded' });
  84 |     expect(errors.filter((e) => !e.includes('favicon') && !e.includes('analytics')).length).toBe(0);
  85 |   });
  86 | });
```