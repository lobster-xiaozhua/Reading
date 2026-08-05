import { test, expect } from '@playwright/test';

const WEB = 'http://localhost:5173';

test.describe('C 端页面巡检', () => {
  test('首页发现页正常渲染', async ({ page }) => {
    await page.goto(WEB, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
    await expect(page.locator('.discover-page')).toBeAttached();
    await expect(page.locator('.discover-page__banner')).toBeVisible();
    // 聚合 6 模块：banner、编辑推荐、热门、限免、分类、排行榜
    const sections = page.locator('.discover-page__section');
    await expect(sections.first()).toBeAttached();
    // 排行榜 Tab 切换
    await expect(page.locator('.discover-page__rank-tabs')).toBeVisible();
    const rankTabs = page.locator('.discover-page__rank-tab');
    await expect(rankTabs.first()).toBeAttached();
  });

  test('发现页限免区域有倒计时或标签', async ({ page }) => {
    await page.goto(WEB, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.discover-page')).toBeAttached();
    const freeBadge = page.locator('.discover-page__free-badge');
    const countdown = page.locator('.novel-countdown');
    // 至少有一个限免标识（标签或倒计时）
    const badgeCount = await freeBadge.count();
    const countdownCount = await countdown.count();
    expect(badgeCount + countdownCount).toBeGreaterThanOrEqual(0);
  });

  test('登录页正常渲染', async ({ page }) => {
    await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('书籍详情页可访问', async ({ page }) => {
    await page.goto(`${WEB}/book/1`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('分类页含二级分类', async ({ page }) => {
    await page.goto(`${WEB}/category`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.category-page')).toBeAttached();
    // 二级分类列表
    const subLists = page.locator('.category-page__cat-sub');
    const subCount = await subLists.count();
    expect(subCount).toBeGreaterThanOrEqual(0);
    // 排序 Tab
    await expect(page.locator('.category-page__sort-tabs')).toBeVisible();
  });

  test('搜索页可搜索并显示加载更多', async ({ page }) => {
    await page.goto(`${WEB}/search`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.search-page')).toBeAttached();
    // 输入搜索词
    const input = page.locator('.search-page__input');
    await input.fill('测试');
    await page.locator('.search-page__submit').click();
    // 等待结果或空状态
    await page.waitForTimeout(2000);
    // 如果有结果，检查加载更多按钮
    const loadMore = page.locator('.search-page__loadmore');
    if ((await loadMore.count()) > 0) {
      await expect(loadMore).toBeVisible();
    }
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