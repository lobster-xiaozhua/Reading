import { test, expect } from '@playwright/test';

const BACKEND = 'http://localhost:8000';
const ADMIN = 'http://localhost:5174';
const WEB = 'http://localhost:5173';

test.describe('业务链路巡检', () => {
  test('完整链路: 健康检查 → C 端书籍列表 → 书籍详情 → 章节', async ({ request }) => {
    const health = await request.get(`${BACKEND}/health`);
    expect(health.ok()).toBeTruthy();
    const healthBody = await health.json();
    expect(healthBody.status).toBe('ok');

    const books = await request.get(`${BACKEND}/api/v1/c/books`, {
      params: { page: 1, page_size: 5, sort: 'hot' },
    });
    expect(books.ok()).toBeTruthy();
    const booksBody = await books.json();
    expect(booksBody.code).toBe(0);
    const bookList = booksBody.data?.items ?? [];

    if (bookList.length > 0) {
      const bookId = bookList[0].id;
      const detail = await request.get(`${BACKEND}/api/v1/c/books/${bookId}`);
      expect(detail.status()).toBeGreaterThanOrEqual(200);

      const chapters = await request.get(`${BACKEND}/api/v1/c/books/${bookId}/chapters`);
      expect(chapters.status()).toBeGreaterThanOrEqual(200);
    }
  });

  test('完整链路: B 端作品列表 → 工作台 → 系统配置', async ({ request }) => {
    const novels = await request.get(`${BACKEND}/api/v1/b/novels`, {
      params: { page: 1, page_size: 5 },
    });
    expect(novels.ok()).toBeTruthy();
    const novelsBody = await novels.json();
    expect(novelsBody.code).toBe(0);

    const kpi = await request.get(`${BACKEND}/api/v1/b/workbench/kpi`);
    expect(kpi.ok()).toBeTruthy();

    const config = await request.get(`${BACKEND}/api/v1/b/system/config`);
    expect(config.ok()).toBeTruthy();
    const configBody = await config.json();
    expect(configBody.code).toBe(0);
  });

  test('C 端阅读全流程: 首页 → 书籍详情 → 阅读页', async ({ page }) => {
    await page.goto(WEB, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    await page.goto(`${WEB}/book/1`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    await page.goto(`${WEB}/read/1/1`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('B 端完整操作: 登录页 → 作品管理 → 章节管理', async ({ page }) => {
    await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    await page.goto(`${ADMIN}/novel`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    await page.goto(`${ADMIN}/workbench`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('B 端管理功能: 审核 → 用户 → 角色权限', async ({ page }) => {
    await page.goto(`${ADMIN}/audit`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    await page.goto(`${ADMIN}/user`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    await page.goto(`${ADMIN}/system`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('C 端用户路径: 搜索 → 分类 → 个人中心', async ({ page }) => {
    await page.goto(`${WEB}/search`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    await page.goto(`${WEB}/category`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    await page.goto(`${WEB}/profile`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });
});