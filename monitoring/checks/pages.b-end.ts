import { test, expect } from '@playwright/test';

const ADMIN = 'http://localhost:5174';

test.describe('B 端页面巡检', () => {
  test('登录页正常渲染', async ({ page }) => {
    await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('404 页面正常渲染', async ({ page }) => {
    await page.goto(`${ADMIN}/nonexistent-route-test`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('控制台无重大错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
    expect(errors.filter((e) => !e.includes('favicon') && !e.includes('analytics')).length).toBe(0);
  });
});