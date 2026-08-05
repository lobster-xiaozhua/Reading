/* ============================================================
 * P0-11 / P0-16 · B 端应用入口
 * - 注入 @novel/tokens/styles/tokens.css（在 global.css 中）
 * - AtlasAdminProvider（ThemeProvider + AntD ConfigProvider）
 * - React Query Provider
 * - i18n 初始化
 * - dayjs 中文 locale（P0-16）
 * - ErrorBoundary 兜底
 * ============================================================ */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import { AtlasAdminProvider } from './theme/AtlasAdminProvider';
import { router } from './router';
import { queryClient } from './api/queryClient';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initErrorMonitor } from './utils/error-monitor';
import './i18n';
import './styles/global.css';

// P0-16 dayjs 中文 locale
dayjs.locale('zh-cn');
// 全局错误监听
initErrorMonitor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AtlasAdminProvider>
          <RouterProvider router={router} />
        </AtlasAdminProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
