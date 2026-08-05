/* ============================================================
 * Service Worker 注册 · P7-6
 * 生产环境启用，开发环境跳过（避免与 HMR 冲突）
 * 更新策略：新版本安装后不自动接管，提示用户点击刷新（applyUpdate）
 * ============================================================ */

import { reportError } from './utils/report';

/** 有新版本可用的自定义事件名（UpdatePrompt 组件监听） */
export const UPDATE_AVAILABLE_EVENT = 'app-update-available';

let pendingReload = false;

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // 仅生产环境注册
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        listenForUpdates(registration);
        // 主动检查更新，避免等待浏览器默认的 24h 周期
        void registration.update().catch(() => {});
      })
      .catch((err) => {
        // 注册失败不影响主流程，仅上报
        reportError(err, { kind: 'sw-register' });
      });
  });
}

function listenForUpdates(registration: ServiceWorkerRegistration): void {
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state !== 'installed') return;
      if (navigator.serviceWorker.controller) {
        // 已有旧版本在控制：有可用更新，交由 UI 提示
        window.dispatchEvent(new CustomEvent(UPDATE_AVAILABLE_EVENT));
      } else {
        // 首次安装：静默接管，无需提示
        newWorker.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  });

  // 新 SW 接管后，若用户已确认刷新则重载页面
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (pendingReload) window.location.reload();
  });
}

/** 用户确认应用更新：通知新 SW 接管并刷新页面 */
export function applyUpdate(): void {
  pendingReload = true;
  const controller = navigator.serviceWorker?.controller;
  if (controller) {
    controller.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}
