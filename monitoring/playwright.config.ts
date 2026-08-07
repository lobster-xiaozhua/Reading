import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './checks',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  workers: 4,
  reporter: [
    ['list'],
    ['json', { outputFile: './results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'backend',
      testMatch: '**/health*.ts',
    },
    {
      name: 'api-b-end',
      testMatch: '**/api.b-end*.ts',
    },
    {
      name: 'api-c-end',
      testMatch: '**/api.c-end*.ts',
    },
    {
      name: 'pages-b-end',
      testMatch: '**/pages.b-end*.ts',
    },
    {
      name: 'pages-c-end',
      testMatch: '**/pages.c-end*.ts',
    },
    {
      name: 'business-flow',
      testMatch: '**/business-flow*.ts',
    },
    {
      name: 'performance',
      testMatch: '**/performance*.ts',
    },
  ],
});