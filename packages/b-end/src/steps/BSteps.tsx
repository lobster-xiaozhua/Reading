/* ============================================================
 * P2-11 · BSteps · B 端步骤条封装
 * 基于 Ant Design Steps，透传 props 并设置 B 端默认方向。
 * Source: 04-B端开发计划.md P2-11
 * ============================================================ */

import { forwardRef, type ComponentProps } from "react";
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
export const BSteps = forwardRef<HTMLDivElement, BStepsProps>(
  ({ direction = "horizontal", ...rest }, ref) => (
    <div ref={ref}>
      <AntSteps direction={direction} {...rest} />
    </div>
  ),
);
BSteps.displayName = "BSteps";
