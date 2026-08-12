import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * BProgress · P2-16
 * 基于 Ant Design Progress 封装，B 端进度条。
 *
 * 用途：完读率统计建议使用 type="circle"；
 *       status 透传 normal / active / success / exception
 * type 支持：line / circle / dashboard
 * ============================================================ */
import { forwardRef } from "react";
import { Progress } from "antd";
export const BProgress = forwardRef(function BProgress(props, ref) {
    return _jsx(Progress, { ref: ref, ...props });
});
//# sourceMappingURL=BProgress.js.map