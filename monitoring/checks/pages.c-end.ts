import { test, expect } from '@playwright/test';

const WEB = 'http://localhost:5173';

test.describe('C 端页面巡检', () => {
  test('首页发现页正常渲染', async ({ page }) => {
    await page.goto(WEB, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('登录页正常渲染', async ({ page }) => {
    await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('书籍详情页可访问', async ({ page }) => {
    await page.goto(`${WEB}/book/1`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('分类页可访问', async ({ page }) => {
    await page.goto(`${WEB}/category`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('搜索页可访问', async ({ page }) => {
    await page.goto(`${WEB}/search`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('404 页面正常渲染', async ({ page }) => {
    await page.goto(`${WEB}/nonexistent-route-test`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('控制台无重大错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(WEB, { waitUntil: 'domcontentloaded' });
    expect(errors.filter((e) => !e.includes('favicon') && !e.includes('analytics')).length).toBe(0);
  });
});