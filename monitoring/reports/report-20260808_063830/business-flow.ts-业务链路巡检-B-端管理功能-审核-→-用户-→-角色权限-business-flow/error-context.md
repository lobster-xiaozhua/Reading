# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: business-flow.ts >> 业务链路巡检 >> B 端管理功能: 审核 → 用户 → 角色权限
- Location: monitoring/checks/business-flow.ts:71:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5174/audit", waiting until "domcontentloaded"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const BACKEND = 'http://localhost:8000';
  4   | const ADMIN = 'http://localhost:5174';
  5   | const WEB = 'http://localhost:5173';
  6   | 
  7   | test.describe('业务链路巡检', () => {
  8   |   test('完整链路: 健康检查 → C 端书籍列表 → 书籍详情 → 章节', async ({ request }) => {
  9   |     const health = await request.get(`${BACKEND}/health`);
  10  |     expect(health.ok()).toBeTruthy();
  11  |     const healthBody = await health.json();
  12  |     expect(healthBody.status).toBe('ok');
  13  | 
  14  |     const books = await request.get(`${BACKEND}/api/v1/c/books`, {
  15  |       params: { page: 1, page_size: 5, sort: 'hot' },
  16  |     });
  17  |     expect(books.ok()).toBeTruthy();
  18  |     const booksBody = await books.json();
  19  |     expect(booksBody.code).toBe(0);
  20  |     const bookList = booksBody.data?.items ?? [];
  21  | 
  22  |     if (bookList.length > 0) {
  23  |       const bookId = bookList[0].id;
  24  |       const detail = await request.get(`${BACKEND}/api/v1/c/books/${bookId}`);
  25  |       expect(detail.status()).toBeGreaterThanOrEqual(200);
  26  | 
  27  |       const chapters = await request.get(`${BACKEND}/api/v1/c/books/${bookId}/chapters`);
  28  |       expect(chapters.status()).toBeGreaterThanOrEqual(200);
  29  |     }
  30  |   });
  31  | 
  32  |   test('完整链路: B 端作品列表 → 工作台 → 系统配置', async ({ request }) => {
  33  |     const novels = await request.get(`${BACKEND}/api/v1/b/novels`, {
  34  |       params: { page: 1, page_size: 5 },
  35  |     });
  36  |     expect(novels.ok()).toBeTruthy();
  37  |     const novelsBody = await novels.json();
  38  |     expect(novelsBody.code).toBe(0);
  39  | 
  40  |     const kpi = await request.get(`${BACKEND}/api/v1/b/workbench/kpi`);
  41  |     expect(kpi.ok()).toBeTruthy();
  42  | 
  43  |     const config = await request.get(`${BACKEND}/api/v1/b/system/config`);
  44  |     expect(config.ok()).toBeTruthy();
  45  |     const configBody = await config.json();
  46  |     expect(configBody.code).toBe(0);
  47  |   });
  48  | 
  49  |   test('C 端阅读全流程: 首页 → 书籍详情 → 阅读页', async ({ page }) => {
  50  |     await page.goto(WEB, { waitUntil: 'domcontentloaded' });
  51  |     await expect(page.locator('body')).toBeAttached();
  52  | 
  53  |     await page.goto(`${WEB}/book/1`, { waitUntil: 'domcontentloaded' });
  54  |     await expect(page.locator('body')).toBeAttached();
  55  | 
  56  |     await page.goto(`${WEB}/read/1/1`, { waitUntil: 'domcontentloaded' });
  57  |     await expect(page.locator('body')).toBeAttached();
  58  |   });
  59  | 
  60  |   test('B 端完整操作: 登录页 → 作品管理 → 章节管理', async ({ page }) => {
  61  |     await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
  62  |     await expect(page.locator('body')).toBeAttached();
  63  | 
  64  |     await page.goto(`${ADMIN}/novel`, { waitUntil: 'domcontentloaded' });
  65  |     await expect(page.locator('body')).toBeAttached();
  66  | 
  67  |     await page.goto(`${ADMIN}/workbench`, { waitUntil: 'domcontentloaded' });
  68  |     await expect(page.locator('body')).toBeAttached();
  69  |   });
  70  | 
  71  |   test('B 端管理功能: 审核 → 用户 → 角色权限', async ({ page }) => {
> 72  |     await page.goto(`${ADMIN}/audit`, { waitUntil: 'domcontentloaded' });
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  73  |     await expect(page.locator('body')).toBeAttached();
  74  | 
  75  |     await page.goto(`${ADMIN}/user`, { waitUntil: 'domcontentloaded' });
  76  |     await expect(page.locator('body')).toBeAttached();
  77  | 
  78  |     await page.goto(`${ADMIN}/system`, { waitUntil: 'domcontentloaded' });
  79  |     await expect(page.locator('body')).toBeAttached();
  80  |   });
  81  | 
  82  |   test('C 端用户路径: 搜索 → 分类 → 个人中心', async ({ page }) => {
  83  |     await page.goto(`${WEB}/search`, { waitUntil: 'domcontentloaded' });
  84  |     await expect(page.locator('body')).toBeAttached();
  85  | 
  86  |     await page.goto(`${WEB}/category`, { waitUntil: 'domcontentloaded' });
  87  |     await expect(page.locator('body')).toBeAttached();
  88  | 
  89  |     await page.goto(`${WEB}/profile`, { waitUntil: 'domcontentloaded' });
  90  |     await expect(page.locator('body')).toBeAttached();
  91  |   });
  92  | 
  93  |   test('C 端发现页 → 分类联动', async ({ page }) => {
  94  |     await page.goto(WEB, { waitUntil: 'domcontentloaded' });
  95  |     await expect(page.locator('.discover-page__category-grid')).toBeVisible();
  96  |     const firstCat = page.locator('.discover-page__category-main').first();
  97  |     if ((await firstCat.count()) > 0) {
  98  |       await firstCat.click();
  99  |       await expect(page.locator('.category-page')).toBeAttached();
  100 |     }
  101 |   });
  102 | });
```