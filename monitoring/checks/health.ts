import { test, expect } from '@playwright/test';

const BACKEND = 'http://localhost:8000';

test.describe('后端健康巡检', () => {
  test('/health 端点正常', async ({ request }) => {
    const res = await request.get(`${BACKEND}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('C 端 API 根路径可访问', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/v1/c/books`, {
      params: { page: 1, page_size: 1 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('B 端 API 根路径可访问', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/v1/b/novels`, {
      params: { page: 1, page_size: 1 },
    });
    expect(res.ok()).toBeTruthy();
  });
});