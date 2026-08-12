import { type ReactNode } from "react";
export interface BSparklineProps {
    data: number[];
    height?: number;
    width?: string | number;
    area?: boolean;
    dot?: boolean;
    color?: string;
    showLastValue?: boolean;
    footer?: ReactNode;
}
export declare function BSparkline({ data, height, width, area, dot, color, showLastValue, footer, }: BSparklineProps): import("react").JSX.Element | null;
//# sourceMappingURL=BSparkline.d.ts.map