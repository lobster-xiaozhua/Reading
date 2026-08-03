import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8000/api/v1/c';

test.describe('C 端 API 巡检', () => {
  test('书籍列表接口', async ({ request }) => {
    const res = await request.get(`${BASE}/books`, {
      params: { page: 1, page_size: 5, sort: 'hot' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.code).toBe(0);
  });

  test('分类页书籍接口', async ({ request }) => {
    const res = await request.get(`${BASE}/books`, {
      params: { category: 'xuanhuan', page: 1, page_size: 5 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('书籍详情接口', async ({ request }) => {
    const res = await request.get(`${BASE}/books/1`);
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test('书籍章节列表接口', async ({ request }) => {
    const res = await request.get(`${BASE}/books/1/chapters`);
    expect(res.ok()).toBeTruthy();
  });

  test('书籍章节内容接口', async ({ request }) => {
    const res = await request.get(`${BASE}/books/1/chapters/1`);
    expect(res.ok()).toBeTruthy();
  });

  test('书籍评论接口', async ({ request }) => {
    const res = await request.get(`${BASE}/books/1/comments`, {
      params: { limit: 5 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('书籍评分分布接口', async ({ request }) => {
    const res = await request.get(`${BASE}/books/1/rating-distribution`);
    expect(res.ok()).toBeTruthy();
  });

  test('相关推荐接口', async ({ request }) => {
    const res = await request.get(`${BASE}/books/1/related`, {
      params: { limit: 4 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('发现页接口', async ({ request }) => {
    const res = await request.get(`${BASE}/banners`);
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test('发现页聚合接口', async ({ request }) => {
    const res = await request.get(`${BASE}/discovery/home`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data.banners)).toBeTruthy();
    expect(Array.isArray(body.data.hotBooks)).toBeTruthy();
    expect(Array.isArray(body.data.freeBooks)).toBeTruthy();
    expect(Array.isArray(body.data.editorPicks)).toBeTruthy();
    expect(Array.isArray(body.data.categories)).toBeTruthy();
    for (const key of ['hot', 'follow', 'ticket', 'new']) {
      expect(Array.isArray(body.data.rankings[key])).toBeTruthy();
    }
  });

  test('热搜接口', async ({ request }) => {
    const res = await request.get(`${BASE}/search/hot`);
    expect(res.ok()).toBeTruthy();
  });

  test('搜索接口', async ({ request }) => {
    const res = await request.get(`${BASE}/search/books`, {
      params: { q: 'test', page: 1, page_size: 5 },
    });
    expect(res.ok()).toBeTruthy();
  });
});