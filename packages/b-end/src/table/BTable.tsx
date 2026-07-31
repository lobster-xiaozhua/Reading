/* ============================================================
 * P2-7 · BTable · B 端表格封装
 * 基于 Ant Design Table，设置 B 端默认值（middle 行高、分页、Skeleton 占位）。
 * 仅消费 @novel/tokens 语义令牌（颜色由 B 端全局样式 / ConfigProvider 注入）。
 * Source: 04-B端开发计划.md P2-7
 * ============================================================ */

import { forwardRef, type ComponentProps, type ComponentRef } from 'react';
import { Skeleton, Table as AntTable } from 'antd';
import type { TableProps } from 'antd';

/** B 端表格 props（泛型，T 为行数据类型） */
export type BTableProps<T = Record<string, unknown>> = TableProps<T> & ComponentProps<typeof AntTable>;

/**
 * B 端表格。
 *
 * B 端默认：
 * - size='middle'（行高 48px，由 B 端全局样式覆盖 .ant-table-tbody > tr > td）
 * - 分页 { pageSize: 20, showSizeChanger, pageSizeOptions: [10,20,50,100], showTotal }
 * - loading 时用 AntD Skeleton 占位（替换默认 Spin）
 *
 * 操作列约定：透传 columns 时不做改动；建议将「操作」列设置为
 *   fixed: 'right'，width 120-160，以保证横向滚动时操作按钮常驻可见。
 */
export const BTable = forwardRef<ComponentRef<typeof AntTable>, BTableProps>(
  ({ size = 'middle', loading, pagination, ...rest }, ref) => {
    if (loading) {
      return <Skeleton active paragraph={{ rows: 6 }} />;
    }
    return (
      <AntTable
        ref={ref}
        size={size}
        pagination={
          pagination === undefined
            ? {
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: (total) => `共 ${total} 条`,
              }
            : pagination
        }
        {...rest}
      />
    );
  },
);

BTable.displayName = 'BTable';
