/* ============================================================
 * Service Worker 注册 · P7-6
 * 生产环境启用，开发环境跳过（避免与 HMR 冲突）
 * ============================================================ */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // 仅生产环境注册
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        // 注册失败不影响主流程，仅记录
        console.warn('[sw] 注册失败', err);
      });
  });
}
