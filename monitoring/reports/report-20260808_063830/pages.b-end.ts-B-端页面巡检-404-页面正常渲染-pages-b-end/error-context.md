# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pages.b-end.ts >> B 端页面巡检 >> 404 页面正常渲染
- Location: monitoring/checks/pages.b-end.ts:11:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5174/nonexistent-route-test", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const ADMIN = 'http://localhost:5174';
  4  | 
  5  | test.describe('B 端页面巡检', () => {
  6  |   test('登录页正常渲染', async ({ page }) => {
  7  |     await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
  8  |     await expect(page.locator('body')).toBeAttached();
  9  |   });
  10 | 
  11 |   test('404 页面正常渲染', async ({ page }) => {
> 12 |     await page.goto(`${ADMIN}/nonexistent-route-test`, { waitUntil: 'domcontentloaded' });
     |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  13 |     await expect(page.locator('body')).toBeAttached();
  14 |   });
  15 | 
  16 |   test('控制台无重大错误', async ({ page }) => {
  17 |     const errors: string[] = [];
  18 |     page.on('console', (msg) => {
  19 |       if (msg.type() === 'error') errors.push(msg.text());
  20 |     });
  21 |     page.on('pageerror', (err) => errors.push(err.message));
  22 | 
  23 |     await page.goto(`${ADMIN}/login`, { waitUntil: 'domcontentloaded' });
  24 |     expect(errors.filter((e) => !e.includes('favicon') && !e.includes('analytics')).length).toBe(0);
  25 |   });
  26 | });
```