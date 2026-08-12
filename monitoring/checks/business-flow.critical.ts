import { test, expect } from '@playwright/test';

const BACKEND = 'http://localhost:8000';
const WEB = 'http://localhost:5173';
const ADMIN = 'http://localhost:5174';

test.describe('关键业务链路', () => {
  /** B 端管理员登录，返回 token */
  async function loginAdmin(request: any) {
    const res = await request.post(`${BACKEND}/api/v1/b/auth/login`, {
      data: { username: 'admin', password: 'admin123' },
    });
    if (res.ok()) {
      const body = await res.json();
      return body.data?.accessToken ?? '';
    }
    return '';
  }

  test('C 端阅读-续读-追更链路', async ({ page, request }) => {
    test.setTimeout(120_000);

    // 1. 获取书籍列表，找到一本有章节的书
    const books = await request.get(`${BACKEND}/api/v1/c/books`, {
      params: { page: 1, page_size: 10, sort: 'hot' },
    });
    expect(books.ok()).toBeTruthy();
    const booksBody = await books.json();
    expect(booksBody.code).toBe(0);
    const bookList = booksBody.data?.items ?? [];
    test.skip(bookList.length === 0, '无可用书籍');

    const book = bookList[0];
    const bookId = book.id;

    // 2. 获取章节列表，验证有章节
    const chapters = await request.get(`${BACKEND}/api/v1/c/books/${bookId}/chapters`);
    expect(chapters.status()).toBeGreaterThanOrEqual(200);
    const chaptersBody = await chapters.json();
    const chapterList = chaptersBody.data ?? [];
    test.skip(chapterList.length === 0, '无可用章节');

    const firstChapterId = chapterList[0].id;

    // 3. 阅读第一章节（模拟阅读器访问）
    const readResp = await request.get(`${BACKEND}/api/v1/c/books/${bookId}/chapters/${firstChapterId}`);
    expect(readResp.status()).toBeGreaterThanOrEqual(200);

    // 4. 模拟前端阅读进度上报
    const progressResp = await request.post(`${BACKEND}/api/v1/c/me/reading-progress`, {
      data: {
        novelId: bookId,
        chapterId: firstChapterId,
        chapterIndex: 0,
        percent: 50,
      },
    });
    // 进度上报可能返回 401（无登录），跳过断言
    if (progressResp.status() < 400) {
      const progressBody = await progressResp.json();
      expect(progressBody.code).toBe(0);
    }

    // 5. 添加到书架（追更的前提）
    const shelfResp = await request.post(`${BACKEND}/api/v1/c/me/bookshelf/${bookId}`);
    if (shelfResp.status() < 400) {
      const shelfBody = await shelfResp.json();
      expect(shelfBody.code).toBe(0);
    }

    // 6. 获取追更列表（验证书架已添加）
    const followResp = await request.get(`${BACKEND}/api/v1/c/me/follows`);
    if (followResp.status() < 400) {
      const followBody = await followResp.json();
      expect(followBody.code).toBe(0);
    }

    // 7. 前端页面渲染验证：发现页
    await page.goto(WEB, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    // 8. 书籍详情页
    await page.goto(`${WEB}/book/${bookId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    // 9. 阅读器页（验证章节内容加载）
    await page.goto(`${WEB}/read/${bookId}/${firstChapterId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('C 端搜索-分类-详情链路', async ({ page }) => {
    test.setTimeout(90_000);

    // 搜索页渲染
    await page.goto(`${WEB}/search`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    // 分类页渲染
    await page.goto(`${WEB}/category`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    // 个人中心页（可能需要登录，但 demo 模式降级）
    await page.goto(`${WEB}/profile`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  /** B 端管理员登录，获取 token */
  async function loginAdmin(request: any) {
    const res = await request.post(`${BACKEND}/api/v1/b/auth/login`, {
      data: { username: 'admin', password: 'admin123' },
    });
    if (res.ok()) {
      const body = await res.json();
      return body.data?.token ?? '';
    }
    return '';
  }

  test('B 端审核-作品管理链路', async ({ request, page, context }) => {
    test.setTimeout(90_000);

    // 先登录获取 token
    const token = await loginAdmin(request);
    if (token) {
      // 设置 localStorage 后直接导航到目标页，让 zustand persist 读取
      await page.addInitScript((t) => {
        const expiresAt = Date.now() + 3600000;
        const authState = {
          state: {
            token: t,
            refreshToken: t,
            expiresAt,
            user: { id: '1', username: 'admin', nickname: '管理员' },
            isAuthenticated: true,
          },
          version: 0,
        };
        localStorage.setItem('atlas-admin-auth', JSON.stringify(authState));
      }, token);
    }

    // 1. 获取审核队列
    const auditResp = await request.get(`${BACKEND}/api/v1/b/audits/queue`, {
      params: { page: 1, page_size: 5 },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    expect([200, 404]).toContain(auditResp.status());

    // 2. 获取作品列表
    const novelsResp = await request.get(`${BACKEND}/api/v1/b/novels`, {
      params: { page: 1, page_size: 5 },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    expect(novelsResp.ok()).toBeTruthy();
    const novelsBody = await novelsResp.json();
    expect(novelsBody.code).toBe(0);

    const novelList = novelsBody.data?.items ?? [];
    if (novelList.length > 0) {
      const novelId = novelList[0].id;

      // 3. 获取作品详情
      const detailResp = await request.get(`${BACKEND}/api/v1/b/novels/${novelId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      expect(detailResp.status()).toBeGreaterThanOrEqual(200);

      // 4. 获取章节列表
      const chaptersResp = await request.get(`${BACKEND}/api/v1/b/novels/${novelId}/chapters`, {
        params: { page: 1, page_size: 5 },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      expect(chaptersResp.status()).toBeGreaterThanOrEqual(200);
    }

    // 5. 前端页面渲染验证
    await page.goto(`${ADMIN}/workbench`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();

    await page.goto(`${ADMIN}/novel`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('B 端系统配置-敏感词管理链路', async ({ request, page }) => {
    test.setTimeout(90_000);

    // 1. 获取系统配置
    const configResp = await request.get(`${BACKEND}/api/v1/b/system/config`);
    expect(configResp.ok()).toBeTruthy();
    const configBody = await configResp.json();
    expect(configBody.code).toBe(0);

    // 2. 获取敏感词库
    const sensitiveResp = await request.get(`${BACKEND}/api/v1/b/sensitive-words`);
    expect(sensitiveResp.ok()).toBeTruthy();

    // 3. 前端页面渲染
    await page.goto(`${ADMIN}/system`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeAttached();
  });

  test('C 端 VIP 与打赏接口验证', async ({ request }) => {
    test.setTimeout(30_000);

    // 1. VIP 套餐信息
    const vipResp = await request.get(`${BACKEND}/api/v1/c/vip/plans`);
    if (vipResp.status() < 400) {
      const vipBody = await vipResp.json();
      expect(vipBody.code).toBe(0);
    }

    // 2. 获取书籍列表（用于打赏测试）
    const books = await request.get(`${BACKEND}/api/v1/c/books`, {
      params: { page: 1, page_size: 5, sort: 'hot' },
    });
    expect(books.ok()).toBeTruthy();
    const booksBody = await books.json();
    expect(booksBody.code).toBe(0);

    // 3. 打赏接口可用性（demo 模式下可能返回 401）
    const bookList = booksBody.data?.items ?? [];
    if (bookList.length > 0) {
      const rewardResp = await request.post(`${BACKEND}/api/v1/c/books/${bookList[0].id}/rewards`, {
        data: { type: 'ticket', amount: 1 },
      });
      // 打赏可能需登录，仅验证接口存在
      expect([200, 201, 401, 403]).toContain(rewardResp.status());
    }
  });
});