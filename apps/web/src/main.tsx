import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { FeedbackProvider } from "@novel/components";
import { router } from "./router";
import { registerServiceWorker } from "./sw-register";
import { initPerfObservers } from "./utils/perf";
import { initErrorMonitor } from "@novel/components";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UpdatePrompt } from "./components/UpdatePrompt";
import "./styles/global.css";

// P7-6 离线阅读：注册 Service Worker（生产环境）
registerServiceWorker();
// P8 性能埋点：LCP / INP / CLS / TTI 观察者
initPerfObservers();
// 全局错误监听
initErrorMonitor();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <FeedbackProvider>
        <UpdatePrompt />
        <RouterProvider router={router} />
      </FeedbackProvider>
    </ErrorBoundary>
  </StrictMode>,
);
