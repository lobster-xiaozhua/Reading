import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * BRate · P2-15
 * 基于 Ant Design Rate 封装，B 端评分组件。
 *
 * 用途：作品质量评分；纯展示场景请设置 disabled
 * B 端默认：count=5（5 星制），allowHalf=true（支持半星）
 * ============================================================ */
import { forwardRef, } from "react";
import { Rate } from "antd";
export const BRate = forwardRef(function BRate({ count = 5, allowHalf = true, ...rest }, ref) {
    return _jsx(Rate, { ref: ref, count: count, allowHalf: allowHalf, ...rest });
});
//# sourceMappingURL=BRate.js.map