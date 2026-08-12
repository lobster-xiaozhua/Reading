import { type ComponentRef, type ReactElement, type Ref } from "react";
import { Table as AntTable } from "antd";
import type { TableProps } from "antd";
export type CompactTableProps<T = Record<string, unknown>> = TableProps<T>;
/** 泛型紧凑表格 */
export declare const CompactTable: <T>(props: CompactTableProps<T> & {
    ref?: Ref<ComponentRef<typeof AntTable>>;
}) => ReactElement;
//# sourceMappingURL=CompactTable.d.ts.map