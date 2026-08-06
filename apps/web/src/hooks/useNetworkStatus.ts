/* ============================================================
 * useNetworkStatus · P7-8
 * 弱网降级：基于 navigator.connection 评估网络质量
 *   - effectiveType: '4g' | '3g' | '2g' | 'slow-2g'
 *   - saveData: navigator.connection.saveData
 *   - online: navigator.onLine
 * 暴露 shouldDegrade：弱网/省流模式时收缩预加载范围
 * ============================================================ */

import { useEffect, useState } from "react";

export type EffectiveType = "4g" | "3g" | "2g" | "slow-2g" | "unknown";

export interface NetworkStatus {
  effectiveType: EffectiveType;
  /** 省流模式（用户开启 Data Saver） */
  saveData: boolean;
  /** 在线状态 */
  online: boolean;
  /** 是否需要降级：2g/3g/省流/离线 均视为降级 */
  shouldDegrade: boolean;
  /** 是否极弱网（2g/slow-2g/离线） */
  isVerySlow: boolean;
}

interface NetworkInformationLike extends EventTarget {
  effectiveType?: EffectiveType;
  saveData?: boolean;
  addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
  removeEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
}

function readConn(): NetworkStatus {
  const conn =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { connection?: NetworkInformationLike })
          .connection
      : undefined;
  const effectiveType = conn?.effectiveType ?? "unknown";
  const saveData = !!conn?.saveData;
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  const isVerySlow =
    online && (effectiveType === "2g" || effectiveType === "slow-2g");
  const shouldDegrade =
    !online ||
    saveData ||
    effectiveType === "2g" ||
    effectiveType === "3g" ||
    effectiveType === "slow-2g";
  return { effectiveType, saveData, online, shouldDegrade, isVerySlow };
}

/**
 * 阅读器预加载范围收缩策略：
 *   - 强网（4g/unknown）：默认 ±2 章
 *   - 弱网（3g）：收缩为 ±1 章
 *   - 极弱网（2g/slow-2g/offline）：禁用预加载（0 章）
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => readConn());

  useEffect(() => {
    const update = () => setStatus(readConn());
    const conn = (
      navigator as Navigator & { connection?: NetworkInformationLike }
    ).connection;
    const connEvents = ["change", "typechange", "effectivechange"];

    connEvents.forEach((evt) => conn?.addEventListener(evt, update));
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      connEvents.forEach((evt) => conn?.removeEventListener(evt, update));
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return status;
}

/**
 * 根据网络状态返回阅读器预加载半径
 * @param defaultRadius 默认半径（强网），通常 2
 */
export function useAdaptivePreloadRadius(defaultRadius = 2): number {
  const { shouldDegrade, isVerySlow, online } = useNetworkStatus();
  if (!online || isVerySlow) return 0;
  if (shouldDegrade) return Math.max(0, defaultRadius - 1);
  return defaultRadius;
}
