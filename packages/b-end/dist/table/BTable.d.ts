import { type ComponentRef, type ReactElement, type Ref } from "react";
import { Table as AntTable } from "antd";
import type { TableProps } from "antd";
/** B 端表格 props（泛型，T 为行数据类型） */
export type BTableProps<T = Record<string, unknown>> = TableProps<T>;
/** 泛型表格组件：保留行数据类型 T，供调用方以 <BTable<T> .../> 精确校验列/数据 */
export declare const BTable: <T>(props: BTableProps<T> & {
    ref?: Ref<ComponentRef<typeof AntTable>>;
}) => ReactElement;
//# sourceMappingURL=BTable.d.ts.map