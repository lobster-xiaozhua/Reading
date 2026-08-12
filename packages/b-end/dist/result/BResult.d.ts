import type { ComponentProps } from "react";
import { Result } from "antd";
export type BResultStatus = "success" | "error" | "warning" | "info" | "404" | "403" | "500";
export interface BResultProps extends Omit<ComponentProps<typeof Result>, "status"> {
    status?: BResultStatus;
}
/**
 * B 端结果反馈
 * - 图标色由 AntD ConfigProvider 映射到 --color-feedback-* 语义令牌
 * - 支持 success/error/warning/info/404/403/500
 */
export declare const BResult: import("react").ForwardRefExoticComponent<BResultProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=BResult.d.ts.map