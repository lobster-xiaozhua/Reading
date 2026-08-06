/* ============================================================
 * Tabs · 02 §1.6
 * line / card 两种样式；键盘导航（← → Home End）
 * ============================================================ */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type TabsType = "line" | "card";
export type TabsSize = "sm" | "md" | "lg";

export interface TabItem {
  key: string;
  label: ReactNode;
  children?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  activeKey: string;
  items: TabItem[];
  type?: TabsType;
  size?: TabsSize;
  onChange?: (key: string) => void;
}

export function Tabs({
  activeKey,
  items,
  type = "line",
  size = "md",
  onChange,
}: TabsProps) {
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);

  // line 样式：底部指示条跟随激活项
  useLayoutEffect(() => {
    if (type !== "line") {
      setIndicatorStyle(null);
      return;
    }
    const el = activeTabRef.current;
    const list = tabListRef.current;
    if (!el || !list) return;
    const elRect = el.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    setIndicatorStyle({
      left: elRect.left - listRect.left + list.scrollLeft,
      width: elRect.width,
    });
  }, [activeKey, items, type]);

  // 激活项滚动到可视区
  useEffect(() => {
    const el = activeTabRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeKey]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const enabledKeys = items.filter((it) => !it.disabled).map((it) => it.key);
    if (enabledKeys.length === 0) return;
    const idx = enabledKeys.indexOf(activeKey);
    let next = idx;
    switch (e.key) {
      case "ArrowRight":
        next = (idx + 1) % enabledKeys.length;
        break;
      case "ArrowLeft":
        next = (idx - 1 + enabledKeys.length) % enabledKeys.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = enabledKeys.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const nextKey = enabledKeys[next]!;
    onChange?.(nextKey);
    // 移动焦点
    requestAnimationFrame(() => {
      const list = tabListRef.current;
      if (!list) return;
      const btn = list.querySelector<HTMLButtonElement>(
        `[data-tab-key="${nextKey}"]`,
      );
      btn?.focus();
    });
  };

  const active = items.find((it) => it.key === activeKey);

  return (
    <div className={`novel-tabs novel-tabs--${type} novel-tabs--${size}`}>
      <div
        ref={tabListRef}
        className="novel-tabs__nav"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
      >
        {items.map((it) => {
          const isActive = it.key === activeKey;
          return (
            <button
              key={it.key}
              ref={isActive ? activeTabRef : undefined}
              type="button"
              role="tab"
              data-tab-key={it.key}
              aria-selected={isActive}
              aria-disabled={it.disabled}
              tabIndex={isActive ? 0 : -1}
              className={`novel-tabs__tab ${isActive ? "is-active" : ""} ${it.disabled ? "is-disabled" : ""}`}
              disabled={it.disabled}
              onClick={() => !it.disabled && onChange?.(it.key)}
            >
              <span className="novel-tabs__label">{it.label}</span>
            </button>
          );
        })}
        {type === "line" && indicatorStyle ? (
          <span
            className="novel-tabs__indicator"
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: indicatorStyle.width,
            }}
            aria-hidden
          />
        ) : null}
      </div>
      <div className="novel-tabs__content" role="tabpanel">
        {active?.children}
      </div>
    </div>
  );
}
