/* ============================================================
 * BProgress · P2-16
 * 基于 Ant Design Progress 封装，B 端进度条。
 *
 * 用途：完读率统计建议使用 type="circle"；
 *       status 透传 normal / active / success / exception
 * type 支持：line / circle / dashboard
 * ============================================================ */

import { forwardRef, type ComponentRef } from "react";
import { Progress, type ProgressProps } from "antd";

export type BProgressProps = ProgressProps;
export type BProgressRef = ComponentRef<typeof Progress>;

export const BProgress = forwardRef<BProgressRef, BProgressProps>(
  function BProgress(props, ref) {
    return <Progress ref={ref} {...props} />;
  },
);
