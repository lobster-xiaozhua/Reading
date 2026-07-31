/* ============================================================
 * P0-8 · React Query 客户端配置
 * - 全局 401 拦截：会话过期自动 logout + 跳转登录页
 * - staleTime 30s，避免频繁重复请求
 * ============================================================ */

import { QueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useAuthStore } from '@/stores/authStore';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: any) => {
        // 401 不重试，由全局 onError 处理
        if (error?.status === 401) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
      onError: (error: any) => {
        // 全局错误处理：401 强制登出
        if (error?.status === 401) {
          useAuthStore.getState().logout();
          message.error('会话已过期，请重新登录');
          const redirect = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?redirect=${redirect}`;
          return;
        }
        const msg = error?.message || '操作失败，请稍后重试';
        message.error(msg);
      },
    },
  },
});
