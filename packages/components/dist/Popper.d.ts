import { type ReactNode } from "react";
export type Placement = "top" | "topStart" | "topEnd" | "bottom" | "bottomStart" | "bottomEnd" | "left" | "leftStart" | "leftEnd" | "right" | "rightStart" | "rightEnd";
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
export declare function usePopper({ placement, offset, open, }: PopperOptions): {
    triggerRef: import("react").RefObject<HTMLDivElement | null>;
    floatRef: import("react").RefObject<HTMLDivElement | null>;
    floatStyle: import("react").CSSProperties;
    ready: boolean;
};
export interface PopperProps extends PopperOptions {
    trigger: ReactNode;
    children: (props: PopperRenderProps) => ReactNode;
}
/** 受控 Popper 容器，渲染 trigger + 浮层（通过 children render prop） */
export declare function Popper({ trigger, children, ...options }: PopperProps): import("react").JSX.Element;
//# sourceMappingURL=Popper.d.ts.map