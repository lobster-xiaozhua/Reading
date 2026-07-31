/* ============================================================
 * BDescriptions · P2-17
 * 基于 Ant Design Descriptions 封装，B 端描述列表。
 *
 * 用途：作品 / 作者详情展示；状态字段建议用 Tag 渲染，
 *       长文本通过 DescriptionsItem.span 跨列展示
 * B 端默认：bordered=true，column 响应式（md 以上 2~3 列）
 * ============================================================ */

import { forwardRef } from 'react';
import { Descriptions, type DescriptionsProps } from 'antd';

export type BDescriptionsProps = DescriptionsProps;

const DEFAULT_COLUMN: NonNullable<BDescriptionsProps['column']> = {
  xs: 1,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 3,
};

export const BDescriptions = forwardRef<HTMLElement, BDescriptionsProps>(
  function BDescriptions({ bordered = true, column = DEFAULT_COLUMN, ...rest }, _ref) {
    return <Descriptions bordered={bordered} column={column} {...rest} />;
  },
);
