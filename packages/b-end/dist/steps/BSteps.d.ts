import { type ComponentProps } from "react";
import { Steps as AntSteps } from "antd";
export type BStepsProps = ComponentProps<typeof AntSteps>;
/**
 * B 端步骤条。
 *
 * - 透传 AntD Steps props（current / items / status / direction 等）
 * - direction 默认 horizontal，可传 vertical
 *
 * 文档：建议步骤数 3-5 个。
 */
export declare const BSteps: import("react").ForwardRefExoticComponent<import("antd").StepsProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=BSteps.d.ts.map