import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * BTransfer · P2-14
 * 基于 Ant Design Transfer 封装，B 端穿梭框。
 *
 * 用途：角色权限分配
 * B 端默认：showSearch=true（左右两栏均支持搜索）
 * ============================================================ */
import { forwardRef } from "react";
import { Transfer } from "antd";
export const BTransfer = forwardRef(function BTransfer({ showSearch = true, ...rest }, _ref) {
    return _jsx(Transfer, { showSearch: showSearch, ...rest });
});
//# sourceMappingURL=BTransfer.js.map