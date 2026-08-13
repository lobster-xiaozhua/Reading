import { test, expect } from '@playwright/test';

/**
 * 全局 API 深度巡检（通过真实 HTTP 请求）
 *
 * 覆盖 monitoring/checks/api.c-end.ts 与 api.b-end.ts 未触及的端点，
 * 作为 Playwright 巡检的补充维度；全端点 100% 覆盖见
 * scripts/global-check/global_check.py。
 */

const BACKEND = 'http://localhost:8000';

test.describe('C 端 API 补充巡检', () => {
  test('搜索建议接口', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/v1/c/search/suggestions`, {
      params: { keyword: '测试' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('搜索热搜接口', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/v1/c/search/hot`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.code).toBe(0);
  });

  test('分类树接口', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/v1/c/categories`);
    expect(res.ok()).toBeTruthy();
  });

  test('标签列表接口', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/v1/c/tags`);
    expect(res.ok()).toBeTruthy();
  });

  test('排行榜各类型接口', async ({ request }) => {
    for (const rank of ['hot', 'follow', 'ticket', 'new']) {
      const res = await request.get(`${BACKEND}/api/v1/c/rankings/${rank}`, {
        params: { limit: 5 },
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.code).toBe(0);
    }
  });

  test('热门/限免/编辑推荐接口', async ({ request }) => {
    for (const ep of ['hot', 'free-limited', 'editor-picks']) {
      const res = await request.get(`${BACKEND}/api/v1/c/books/${ep}`);
      expect(res.ok()).toBeTruthy();
    }
  });

  test('推荐/话题/书单/精选书评接口', async ({ request }) => {
    for (const ep of ['recommendations', 'topics', 'book-lists', 'reviews']) {
      const res = await request.get(`${BACKEND}/api/v1/c/${ep}`, {
        params: { limit: 5 },
      });
      expect(res.ok()).toBeTruthy();
    }
  });

  test('VIP 套餐与支付方式接口', async ({ request }) => {
    for (const ep of ['vip/plans', 'payment/methods']) {
      const res = await request.get(`${BACKEND}/api/v1/c/${ep}`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.code).toBe(0);
    }
  });

  test('读者统计接口', async ({ request }) => {
    for (const ep of ['stats/overview', 'stats/heatmap', 'stats/preferences', 'badges', 'follows', 'rewards']) {
      const res = await request.get(`${BACKEND}/api/v1/c/me/${ep}`);
      expect(res.ok()).toBeTruthy();
    }
  });

  test('RUM 上报接口（写操作，验证响应包裹）', async ({ request }) => {
    const res = await request.post(`${BACKEND}/api/v1/c/rum`, {
      data: { type: 'perf', name: 'smoke', value: 1 },
    });
    expect(res.status()).toBeLessThan(500);
    const body = await res.json();
    expect(body).toHaveProperty('code');
    expect(body).toHaveProperty('message');
  });
});

test.describe('B 端 API 补充巡检', () => {
  test('RUM 统计与事件接口', async ({ request }) => {
    for (const ep of ['stats', 'events']) {
      const res = await request.get(`${BACKEND}/api/v1/b/rum/${ep}`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.code).toBe(0);
    }
  });

  test('工作台概览与字数趋势接口', async ({ request }) => {
    for (const ep of ['overviews', 'word-trend']) {
      const res = await request.get(`${BACKEND}/api/v1/b/workbench/${ep}`, {
        params: { days: 30 },
      });
      expect(res.ok()).toBeTruthy();
    }
  });

  test('图表各类型接口', async ({ request }) => {
    for (const ep of [
      'workbench-trend',
      'word-count-growth',
      'reading-heatmap',
      'reading-funnel',
      'ranking-trend',
      'category-distribution',
    ]) {
      const res = await request.get(`${BACKEND}/api/v1/b/charts/${ep}`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.code).toBe(0);
    }
  });

  test('作品详情接口', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/v1/b/novels/1`);
    expect(res.status()).toBeLessThan(500);
  });

  test('作品统计与章节列表接口', async ({ request }) => {
    for (const ep of ['stats', 'chapters', 'audit-history', 'comments']) {
      const res = await request.get(`${BACKEND}/api/v1/b/novels/1/${ep}`);
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('角色详情与权限点接口', async ({ request }) => {
    const role = await request.get(`${BACKEND}/api/v1/b/roles/super-admin`);
    expect(role.status()).toBeLessThan(500);
    const perms = await request.get(`${BACKEND}/api/v1/b/permissions`);
    expect(perms.ok()).toBeTruthy();
    const body = await perms.json();
    expect(body.code).toBe(0);
  });

  test('敏感词库接口', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/v1/b/sensitive-words`);
    expect(res.ok()).toBeTruthy();
  });

  test('批量导入章节接口', async ({ request }) => {
    const res = await request.post(`${BACKEND}/api/v1/b/chapters/import`, {
      multipart: {
        novel_id: '1',
        files: {
          name: '测试章.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('测试正文内容，用于验证导入接口是否正常。'),
        },
      },
    });
    expect(res.status()).toBeLessThan(500);
    const body = await res.json();
    expect(body.code).toBe(0);
  });

  test('封面上传接口', async ({ request }) => {
    const png = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
    ]);
    const res = await request.post(`${BACKEND}/api/v1/b/uploads/image`, {
      multipart: {
        file: {
          name: 'cover.png',
          mimeType: 'image/png',
          buffer: png,
        },
      },
    });
    expect(res.status()).toBeLessThan(500);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data?.url).toContain('/uploads/covers/');
  });

  test('读者列表接口', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/v1/b/users`, {
      params: { page: 1, page_size: 5 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('B 端鉴权流程：登录 → me → refresh', async ({ request }) => {
    // 登录
    const login = await request.post(`${BACKEND}/api/v1/b/auth/login`, {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(login.status()).toBeLessThan(500);
    const loginBody = await login.json();

    // me（鉴权）
    const me = await request.get(`${BACKEND}/api/v1/b/auth/me`, {
      headers: { Authorization: `Bearer ${loginBody.data?.token ?? ''}` },
    });
    expect(me.status()).toBeLessThan(500);

    // 刷新（用无效 token 验证非 500 的优雅降级）
    const refresh = await request.post(`${BACKEND}/api/v1/b/auth/refresh`, {
      data: { refreshToken: 'invalid-refresh-token' },
    });
    expect(refresh.status()).toBeLessThan(500);
  });
});
