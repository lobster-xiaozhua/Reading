/* ============================================================
 * BRate · P2-15
 * 基于 Ant Design Rate 封装，B 端评分组件。
 *
 * 用途：作品质量评分；纯展示场景请设置 disabled
 * B 端默认：count=5（5 星制），allowHalf=true（支持半星）
 * ============================================================ */

import {
  forwardRef,
  type ComponentRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from 'react';
import { Rate, type RateProps } from 'antd';

export type BRateProps = RateProps;
export type BRateRef = ComponentRef<typeof Rate>;

export const BRate: ForwardRefExoticComponent<
  BRateProps & RefAttributes<BRateRef>
> = forwardRef<BRateRef, BRateProps>(function BRate(
  { count = 5, allowHalf = true, ...rest },
  ref,
) {
  return <Rate ref={ref} count={count} allowHalf={allowHalf} {...rest} />;
});
