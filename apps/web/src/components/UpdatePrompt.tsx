import { useEffect, useState } from "react";
import { applyUpdate, UPDATE_AVAILABLE_EVENT } from "@/sw-register";
import "./UpdatePrompt.css";

/**
 * PWA 新版本提示浮条（P7-6）
 * 监听 Service Worker 更新就绪事件，引导用户刷新体验新版本
 */
export function UpdatePrompt() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const handler = () => setAvailable(true);
    window.addEventListener(UPDATE_AVAILABLE_EVENT, handler);
    return () => window.removeEventListener(UPDATE_AVAILABLE_EVENT, handler);
  }, []);

  if (!available) return null;

  return (
    <div className="novel-update-prompt" role="status" aria-live="polite">
      <span className="novel-update-prompt__text">
        发现新版本，刷新以体验最新内容
      </span>
      <button
        type="button"
        className="novel-update-prompt__btn"
        onClick={applyUpdate}
      >
        立即刷新
      </button>
    </div>
  );
}
