import { test, expect } from '@playwright/test';

const ADMIN = 'http://localhost:5174';
const BACKEND = 'http://localhost:8000';

async function loginAndInject(page: any, request: any) {
  const res = await request.post(`${BACKEND}/api/v1/b/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const body = await res.json();
  const token = body.data?.token ?? '';
  await page.addInitScript((t) => {
    const user = {
      id: '1',
      username: 'admin',
      nickname: '管理员',
      roles: ['super-admin'],
      permissions: [
        'novel.list', 'novel.create', 'chapter.list', 'chapter.create',
        'chapter.edit', 'chapter.delete', 'audit.list', 'system.config',
      ],
    };
    localStorage.setItem('atlas-admin-auth', JSON.stringify({
      state: { token: t, refreshToken: t, expiresAt: Date.now() + 3600000, user, isAuthenticated: true },
      version: 0,
    }));
  }, token);
}

test.describe.configure({ timeout: 90000 });

test('章节导入弹窗 UI 验证', async ({ page, request }) => {
  await loginAndInject(page, request);
  await page.goto(`${ADMIN}/chapter/1`, { waitUntil: 'domcontentloaded' });

  // 等待页面进入 ready 状态（页面容器出现）
  await expect(page.locator('.b-chapter-list-page')).toBeAttached({ timeout: 30000 });

  const importBtn = page.getByRole('button', { name: /导入章节/ });
  await expect(importBtn).toBeVisible({ timeout: 20000 });
  await importBtn.click();

  await expect(page.locator('.ant-modal-title', { hasText: '批量导入章节' })).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.ci-dragger')).toBeVisible();
  await expect(page.getByText(/拖拽 .txt 文件到此处/)).toBeVisible();
  await page.screenshot({ path: '/tmp/import-modal.png' });
});

test('导入弹窗交互：文件选择与列表', async ({ page, request }) => {
  await loginAndInject(page, request);
  await page.goto(`${ADMIN}/chapter/1`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.b-chapter-list-page')).toBeAttached({ timeout: 30000 });

  const importBtn = page.getByRole('button', { name: /导入章节/ });
  await expect(importBtn).toBeVisible({ timeout: 20000 });
  await importBtn.click();
  await expect(page.locator('.ant-modal-title', { hasText: '批量导入章节' })).toBeVisible();

  // 通过隐藏的 input 选择文件
  const input = page.locator('input[type=file]').last();
  await input.setInputFiles([
    { name: '第一章 测试.txt', mimeType: 'text/plain', buffer: Buffer.from('第一章正文内容，用于测试。') },
    { name: '第二章 测试.txt', mimeType: 'text/plain', buffer: Buffer.from('第二章正文内容，用于测试。') },
  ]);

  await expect(page.locator('.ci-item')).toHaveCount(2);
  const fileNames = await page.locator('.ci-item-name').allInnerTexts();
  const joined = fileNames.join(',');
  expect(joined).toContain('第一章 测试.txt');
  expect(joined).toContain('第二章 测试.txt');
  await expect(page.getByRole('button', { name: /开始导入/ })).toBeVisible();
  await page.screenshot({ path: '/tmp/import-files.png' });
});

test('完整导入流程：文件选择到导入成功', async ({ page, request }) => {
  await loginAndInject(page, request);
  await page.goto(`${ADMIN}/chapter/2`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.b-chapter-list-page')).toBeAttached({ timeout: 30000 });

  const importBtn = page.getByRole('button', { name: /导入章节/ });
  await expect(importBtn).toBeVisible({ timeout: 20000 });
  await importBtn.click();
  await expect(page.locator('.ant-modal-title', { hasText: '批量导入章节' })).toBeVisible();

  const input = page.locator('input[type=file]').last();
  await input.setInputFiles([
    { name: 'e2e导入第一章.txt', mimeType: 'text/plain', buffer: Buffer.from('这是 e2e 测试导入的第一章正文内容，用于验证完整导入链路。') },
    { name: 'e2e导入第二章.txt', mimeType: 'text/plain', buffer: Buffer.from('这是 e2e 测试导入的第二章正文内容，用于验证完整导入链路。') },
  ]);

  await expect(page.locator('.ci-item')).toHaveCount(2);
  await page.getByRole('button', { name: /开始导入/ }).click();

  // 等待导入完成：所有文件状态变为成功（一次请求批量返回，文件名按排序展示）
  await page.waitForTimeout(3000);
  await expect(page.locator('.ci-item-status')).toHaveCount(2, { timeout: 30000 });
  const statusTexts = await page.locator('.ci-item-status').allInnerTexts();
  expect(statusTexts.every((s) => s.includes('成功'))).toBe(true);
  // 弹窗应保持打开，展示结果（新代码 onDone 不关闭弹窗）
  await page.screenshot({ path: '/tmp/import-done.png' });
  // 关闭弹窗后，列表新导入章节应有高亮提示
  await page.locator('.ant-modal-footer .ant-btn').first().click();
  await page.waitForTimeout(800);
  await expect(page.locator('.b-chapter-row-highlight')).toHaveCount(2, { timeout: 10000 });
  await page.screenshot({ path: '/tmp/import-highlight.png' });
});

test('导入弹窗：正文预览与拖拽排序', async ({ page, request }) => {
  await loginAndInject(page, request);
  await page.goto(`${ADMIN}/chapter/1`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.b-chapter-list-page')).toBeAttached({ timeout: 30000 });

  const importBtn = page.getByRole('button', { name: /导入章节/ });
  await expect(importBtn).toBeVisible({ timeout: 20000 });
  await importBtn.click();
  await expect(page.locator('.ant-modal-title', { hasText: '批量导入章节' })).toBeVisible();

  const input = page.locator('input[type=file]').last();
  await input.setInputFiles([
    { name: '预览第一章.txt', mimeType: 'text/plain', buffer: Buffer.from('第一段预览正文：山巅之上，雾气翻涌。') },
    { name: '预览第二章.txt', mimeType: 'text/plain', buffer: Buffer.from('第二段预览正文：剑客立于崖边。') },
  ]);

  // 拖拽手柄可见
  await expect(page.locator('.ci-item-drag-handle')).toHaveCount(2);
  // 点击文件名打开预览 Drawer
  await page.locator('.ci-item-name-link').first().click();
  await expect(page.locator('.ci-preview-body')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.ci-preview-body')).toContainText('预览正文');
  await page.screenshot({ path: '/tmp/import-preview.png' });
});
