import type { GaugeConfig } from "@ant-design/charts";
export interface BGaugeProps {
    /** 当前值（0-1） */
    value: number;
    /** 最小值 */
    min?: number;
    /** 最大值 */
    max?: number;
    /** 中心标题 */
    title?: string;
    height?: number;
    emptyDescription?: string;
    config?: Partial<GaugeConfig>;
}
export declare function BGauge({ value, min, max, title, height, emptyDescription, config, }: BGaugeProps): import("react").JSX.Element;
//# sourceMappingURL=BGauge.d.ts.map