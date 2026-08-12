import type { FunnelConfig } from "@ant-design/charts";
export interface FunnelStage {
    /** 阶段名 */
    stage: string;
    /** 数值 */
    value: number;
}
export interface ReadingFunnelProps {
    data: FunnelStage[];
    height?: number;
    emptyDescription?: string;
    config?: Partial<FunnelConfig>;
}
export declare function ReadingFunnel({ data, height, emptyDescription, config, }: ReadingFunnelProps): import("react").JSX.Element;
//# sourceMappingURL=ReadingFunnel.d.ts.map