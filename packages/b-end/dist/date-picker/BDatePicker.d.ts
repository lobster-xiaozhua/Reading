import { type ComponentProps, type ComponentRef, type ForwardRefExoticComponent, type RefAttributes } from "react";
import { DatePicker as AntDatePicker } from "antd";
import { type Dayjs } from "dayjs";
/**
 * disabledDate 工具：禁用未来日期（B 端查询 / 筛选常用）。
 *
 * @example <BDatePicker disabledDate={disabledFutureDate} />
 */
export declare function disabledFutureDate(current: Dayjs): boolean;
/**
 * disabledDate 工具：禁用指定天数之前的日期（近 N 天可选）。
 *
 * @example <BRangePicker disabledDate={(d) => disabledBefore(d, 30)} />
 */
export declare function disabledBefore(current: Dayjs, days: number): boolean;
export type BDatePickerProps = ComponentProps<typeof AntDatePicker>;
/**
 * B 端日期选择器。
 *
 * - 透传 AntD DatePicker props（showTime 可选透传）
 * - 默认 format='YYYY-MM-DD'
 */
export declare const BDatePicker: ForwardRefExoticComponent<BDatePickerProps & RefAttributes<ComponentRef<typeof AntDatePicker>>>;
export type BRangePickerProps = ComponentProps<typeof AntDatePicker.RangePicker>;
/**
 * B 端范围选择器。
 *
 * - 透传 AntD RangePicker props（showTime 可选透传）
 * - 默认 ranges 预设：今天 / 本周 / 本月 / 近30天（dayjs 计算）
 */
export declare const BRangePicker: ForwardRefExoticComponent<BRangePickerProps & RefAttributes<ComponentRef<typeof AntDatePicker.RangePicker>>>;
//# sourceMappingURL=BDatePicker.d.ts.map