/* ============================================================
 * report · 前端运行时错误 / 性能指标统一上报（P8）
 *   - 开发环境：console 输出，便于本地调试
 *   - 生产环境：sendBeacon 上报到 RUM 端点（不可用时回退 fetch keepalive）
 *   - RUM 端点：POST /api/v1/c/rum（无鉴权匿名埋点）
 * ============================================================ */

export interface RumEvent {
  type: "perf" | "error";
  name: string;
  value?: number;
  rating?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

const RUM_ENDPOINT = "/api/v1/c/rum";

/** 生产环境上报单条 RUM 事件（开发环境仅静默跳过，由调用方自行输出） */
export function sendRum(event: RumEvent): void {
  if (import.meta.env.DEV) return;
  const payload = JSON.stringify(event);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(RUM_ENDPOINT, payload);
    } else {
      void fetch(RUM_ENDPOINT, {
        method: "POST",
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* 上报失败忽略，不影响业务 */
  }
}

/** 上报运行时错误（开发环境直接 console.error，生产环境发往 RUM） */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const message = error instanceof Error ? error.message : String(error);
  if (import.meta.env.DEV) {
    console.error(`[error] ${name}:`, message, context ?? "");
    return;
  }
  sendRum({ type: "error", name, message, meta: context });
}
