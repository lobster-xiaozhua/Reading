/* ============================================================
 * P2-12 · BCascader · B 端级联选择封装
 * 基于 Ant Design Cascader，透传 props 并设置 B 端默认值。
 * Source: 04-B端开发计划.md P2-12
 * ============================================================ */

import { forwardRef, type ComponentProps, type ComponentRef } from 'react';
import { Cascader as AntCascader } from 'antd';

export type BCascaderProps = ComponentProps<typeof AntCascader>;

/**
 * B 端级联选择。
 *
 * - 透传 AntD Cascader props
 * - 默认 changeOnSelect=true（允许选择任意层级，无需选到叶子）
 * - 默认 showSearch=true（支持搜索）
 *
 * 文档：建议层级 ≤ 3 级。
 */
export const BCascader = forwardRef<ComponentRef<typeof AntCascader>, BCascaderProps>(
  ({ changeOnSelect = true, showSearch = true, ...rest }, ref) => (
    <AntCascader ref={ref} changeOnSelect={changeOnSelect} showSearch={showSearch} {...rest} />
  ),
);
BCascader.displayName = 'BCascader';
