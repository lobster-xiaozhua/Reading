export function initErrorMonitor() {
    if (typeof window === "undefined")
        return;
    window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        const detail = reason instanceof Error ? reason.message : String(reason);
        console.error("[unhandledrejection]", detail, reason);
    });
    window.addEventListener("error", (event) => {
        if (event.target && event.target.tagName)
            return;
        console.error("[error]", event.message, event.filename, event.lineno);
    });
}
//# sourceMappingURL=error-monitor.js.map