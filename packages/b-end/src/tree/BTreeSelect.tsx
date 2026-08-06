/* ============================================================
 * BTreeSelect · P2-13
 * 基于 Ant Design TreeSelect 封装，B 端树形选择器。
 *
 * 用途：权限树 / 章节树 / 分类树
 * B 端默认：showSearch=true（支持搜索过滤）
 * ============================================================ */

import { forwardRef, type ComponentRef } from "react";
import { TreeSelect, type TreeSelectProps } from "antd";

export type BTreeSelectProps = TreeSelectProps;
export type BTreeSelectRef = ComponentRef<typeof TreeSelect>;

export const BTreeSelect = forwardRef<BTreeSelectRef, BTreeSelectProps>(
  function BTreeSelect({ showSearch = true, ...rest }, ref) {
    return <TreeSelect ref={ref} showSearch={showSearch} {...rest} />;
  },
);
