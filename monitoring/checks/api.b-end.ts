import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8000/api/v1/b';

test.describe('B 端 API 巡检', () => {
  test('作品列表接口', async ({ request }) => {
    const res = await request.get(`${BASE}/novels`, {
      params: { page: 1, page_size: 5 },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data?.list)).toBeTruthy();
  });

  test('作品分类接口', async ({ request }) => {
    const res = await request.get(`${BASE}/novels`, {
      params: { page: 1, page_size: 1, category: 'xuanhuan' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('工作台 KPI 接口', async ({ request }) => {
    const res = await request.get(`${BASE}/workbench/kpi`);
    expect(res.ok()).toBeTruthy();
  });

  test('工作台趋势接口', async ({ request }) => {
    const res = await request.get(`${BASE}/workbench/word-trend`, {
      params: { range: 30 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('审核队列接口', async ({ request }) => {
    const res = await request.get(`${BASE}/audits/queue`);
    expect(res.ok()).toBeTruthy();
  });

  test('用户列表接口', async ({ request }) => {
    const res = await request.get(`${BASE}/users`, {
      params: { page: 1, page_size: 5 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('角色列表接口', async ({ request }) => {
    const res = await request.get(`${BASE}/roles`);
    expect(res.ok()).toBeTruthy();
  });

  test('系统配置接口', async ({ request }) => {
    const res = await request.get(`${BASE}/system/config`);
    expect(res.ok()).toBeTruthy();
  });

  test('稿费列表接口', async ({ request }) => {
    const res = await request.get(`${BASE}/royalties`, {
      params: { page: 1, page_size: 5 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('敏感词库接口', async ({ request }) => {
    const res = await request.get(`${BASE}/sensitive-words`);
    expect(res.ok()).toBeTruthy();
  });

  test('图表数据接口', async ({ request }) => {
    const res = await request.get(`${BASE}/charts/basic`, {
      params: { type: 'overview' },
    });
    expect(res.ok()).toBeTruthy();
  });
});