import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P2-6 · Result 结果反馈
 * status success/error/warning/info/404/403/500 + title + subTitle + extra
 * 图标色映射功能色
 * Source: 04 §6.18
 * ============================================================ */
import { forwardRef } from "react";
import { Result } from "antd";
/**
 * B 端结果反馈
 * - 图标色由 AntD ConfigProvider 映射到 --color-feedback-* 语义令牌
 * - 支持 success/error/warning/info/404/403/500
 */
export const BResult = forwardRef(function BResult({ status = "info", ...rest }, ref) {
    return (_jsx("div", { ref: ref, children: _jsx(Result, { status: status, ...rest }) }));
});
//# sourceMappingURL=BResult.js.map