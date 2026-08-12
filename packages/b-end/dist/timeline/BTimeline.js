import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * BTimeline · P2-18
 * 基于 Ant Design Timeline 封装，B 端时间线。
 *
 * 用途：操作日志 / 审计追踪；最新记录展示在顶部，
 *       节点内容建议含 时间 + 操作人 + 操作内容
 * B 端默认：mode='left'（左对齐）
 * item color 支持：green / blue / red / gray
 * ============================================================ */
import { forwardRef } from "react";
import { Timeline } from "antd";
export const BTimeline = forwardRef(function BTimeline({ mode = "left", ...rest }, _ref) {
    return _jsx(Timeline, { mode: mode, ...rest });
});
//# sourceMappingURL=BTimeline.js.map