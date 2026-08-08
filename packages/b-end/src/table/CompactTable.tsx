/* ============================================================
 * CompactTable · 紧凑型数据表格
 * 在 BTable 基础上提供更高信息密度的表格样式。
 * 特性：
 *   - size="small" 行高压缩，单屏展示更多数据
 *   - 表头小字 + 大写字母间距 + 弱化色
 *   - 行悬浮左侧品牌色指示条
 *   - 统一紧凑分页
 * ============================================================ */

import { forwardRef, type ComponentRef, type ReactElement, type Ref } from "react";
import { Table as AntTable } from "antd";
import type { TableProps } from "antd";

export type CompactTableProps<T = Record<string, unknown>> = TableProps<T>;

const CompactTableInner = forwardRef<ComponentRef<typeof AntTable>, CompactTableProps>(
  function CompactTableInner({ size = "small", pagination, className, ...rest }, ref) {
    return (
      <AntTable
        ref={ref}
        size={size}
        className={`compact-table ${className ?? ""}`.trim()}
        pagination={
          pagination === undefined
            ? {
                size: "small",
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

CompactTableInner.displayName = "CompactTable";

/** 泛型紧凑表格 */
export const CompactTable = CompactTableInner as <T>(
  props: CompactTableProps<T> & { ref?: Ref<ComponentRef<typeof AntTable>> },
) => ReactElement;