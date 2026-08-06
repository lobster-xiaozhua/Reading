/* ============================================================
 * Popper · 轻量定位工具
 * Tooltip / Popover / Dropdown 共享的定位逻辑
 * 支持 12 方位（top/bottom/left/right × start/center/end）
 * ============================================================ */

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Placement =
  | "top"
  | "topStart"
  | "topEnd"
  | "bottom"
  | "bottomStart"
  | "bottomEnd"
  | "left"
  | "leftStart"
  | "leftEnd"
  | "right"
  | "rightStart"
  | "rightEnd";

export interface PopperOptions {
  placement?: Placement;
  /** 与触发元素的间距，默认 8px */
  offset?: number;
  /** 是否开启，false 时直接不渲染浮层 */
  open: boolean;
}

export interface PopperRenderProps {
  /** 浮层根节点 ref */
  floatRef: React.RefObject<HTMLDivElement | null>;
  /** 触发器 ref */
  triggerRef: React.RefObject<HTMLDivElement | null>;
  /** 计算后的内联样式（left/top） */
  floatStyle: React.CSSProperties;
  /** 是否已定位完成（用于动画起始） */
  ready: boolean;
}

/**
 * 简易定位 Hook：根据 trigger 与 float 的尺寸计算 left/top。
 * 不依赖第三方库，使用 fixed 定位 + viewport 边缘翻转。
 */
export function usePopper({
  placement = "top",
  offset = 8,
  open,
}: PopperOptions) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const floatRef = useRef<HTMLDivElement | null>(null);
  const [floatStyle, setFloatStyle] = useState<React.CSSProperties>({
    visibility: "hidden",
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      setFloatStyle({ visibility: "hidden" });
      return;
    }
    const trigger = triggerRef.current;
    const fl = floatRef.current;
    if (!trigger || !fl) return;

    const tr = trigger.getBoundingClientRect();
    const fw = fl.offsetWidth;
    const fh = fl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // 计算主轴 + 交叉轴
    let top = 0;
    let left = 0;
    const [side, align] = [
      placement.replace(/(Start|End)$/, ""),
      placement.match(/(Start|End)$/)?.[1] ?? "Center",
    ];

    // 主轴位置
    if (side === "top") top = tr.top - fh - offset;
    if (side === "bottom") top = tr.bottom + offset;
    if (side === "left") left = tr.left - fw - offset;
    if (side === "right") left = tr.right + offset;

    // 交叉轴
    if (side === "top" || side === "bottom") {
      if (align === "Start") left = tr.left;
      else if (align === "End") left = tr.right - fw;
      else left = tr.left + tr.width / 2 - fw / 2;
    } else {
      if (align === "Start") top = tr.top;
      else if (align === "End") top = tr.bottom - fh;
      else top = tr.top + tr.height / 2 - fh / 2;
    }

    // viewport 翻转
    if (left < 8) left = 8;
    if (left + fw > vw - 8) left = vw - fw - 8;
    if (top < 8) top = 8;
    if (top + fh > vh - 8) top = vh - fh - 8;

    setFloatStyle({
      position: "fixed",
      left: left + scrollX,
      top: top + scrollY,
      visibility: "visible",
    });
    // 下一帧标记 ready，触发进入动画
    requestAnimationFrame(() => setReady(true));
  }, [open, placement, offset]);

  return { triggerRef, floatRef, floatStyle, ready };
}

export interface PopperProps extends PopperOptions {
  trigger: ReactNode;
  children: (props: PopperRenderProps) => ReactNode;
}

/** 受控 Popper 容器，渲染 trigger + 浮层（通过 children render prop） */
export function Popper({ trigger, children, ...options }: PopperProps) {
  const { triggerRef, floatRef, floatStyle, ready } = usePopper(options);
  return (
    <>
      <div ref={triggerRef} style={{ display: "inline-flex" }}>
        {trigger}
      </div>
      {options.open
        ? children({ triggerRef, floatRef, floatStyle, ready })
        : null}
    </>
  );
}
