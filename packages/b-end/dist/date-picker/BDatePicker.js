import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P2-10 · BDatePicker / BRangePicker · B 端日期封装
 * 基于 Ant Design DatePicker，设置 B 端默认值并提供 dayjs 工具函数。
 * Source: 04-B端开发计划.md P2-10
 * ============================================================ */
import { forwardRef, } from "react";
import { DatePicker as AntDatePicker } from "antd";
import dayjs from "dayjs";
/**
 * disabledDate 工具：禁用未来日期（B 端查询 / 筛选常用）。
 *
 * @example <BDatePicker disabledDate={disabledFutureDate} />
 */
export function disabledFutureDate(current) {
    return current.isAfter(dayjs().endOf("day"));
}
/**
 * disabledDate 工具：禁用指定天数之前的日期（近 N 天可选）。
 *
 * @example <BRangePicker disabledDate={(d) => disabledBefore(d, 30)} />
 */
export function disabledBefore(current, days) {
    return current.isBefore(dayjs().subtract(days, "day").startOf("day"));
}
/**
 * B 端日期选择器。
 *
 * - 透传 AntD DatePicker props（showTime 可选透传）
 * - 默认 format='YYYY-MM-DD'
 */
export const BDatePicker = forwardRef(({ format = "YYYY-MM-DD", ...rest }, ref) => (_jsx(AntDatePicker, { ref: ref, format: format, ...rest })));
BDatePicker.displayName = "BDatePicker";
/** B 端默认范围预设：今天 / 本周 / 本月 / 近30天（dayjs 计算） */
const DEFAULT_RANGES = {
    今天: () => [dayjs(), dayjs()],
    本周: () => [dayjs().startOf("week"), dayjs().endOf("week")],
    本月: () => [dayjs().startOf("month"), dayjs().endOf("month")],
    近30天: () => [dayjs().subtract(29, "day"), dayjs()],
};
/**
 * B 端范围选择器。
 *
 * - 透传 AntD RangePicker props（showTime 可选透传）
 * - 默认 ranges 预设：今天 / 本周 / 本月 / 近30天（dayjs 计算）
 */
export const BRangePicker = forwardRef(({ ranges = DEFAULT_RANGES, ...rest }, ref) => (_jsx(AntDatePicker.RangePicker, { ref: ref, ranges: ranges, ...rest })));
BRangePicker.displayName = "BRangePicker";
//# sourceMappingURL=BDatePicker.js.map