export function initErrorMonitor() {
  if (typeof window === 'undefined') return;
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const detail = reason instanceof Error ? reason.message : String(reason);
    console.error('[unhandledrejection]', detail, reason);
  });
  window.addEventListener('error', (event: ErrorEvent) => {
    if (event.target && (event.target as HTMLElement).tagName) return;
    console.error('[error]', event.message, event.filename, event.lineno);
  });
}