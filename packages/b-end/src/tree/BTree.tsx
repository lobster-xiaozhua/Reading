/* ============================================================
 * BTree · P2-13
 * 基于 Ant Design Tree 封装，B 端运营后台树形数据展示与选择。
 *
 * 用途：权限树 / 章节树 / 分类树
 * B 端默认：virtual=true（大数据量时启用虚拟滚动，需配合 height 使用）
 *           checkable 不强制开启，由业务方按需透传
 * ============================================================ */

import {
  forwardRef,
  type ComponentRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from 'react';
import { Tree, type TreeProps } from 'antd';

export type BTreeProps = TreeProps;
export type BTreeRef = ComponentRef<typeof Tree>;

export const BTree: ForwardRefExoticComponent<
  BTreeProps & RefAttributes<BTreeRef>
> = forwardRef<BTreeRef, BTreeProps>(function BTree(
  { virtual = true, ...rest },
  ref,
) {
  return <Tree ref={ref} virtual={virtual} {...rest} />;
});
