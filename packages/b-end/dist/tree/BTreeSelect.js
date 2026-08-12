import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * BTreeSelect · P2-13
 * 基于 Ant Design TreeSelect 封装，B 端树形选择器。
 *
 * 用途：权限树 / 章节树 / 分类树
 * B 端默认：showSearch=true（支持搜索过滤）
 * ============================================================ */
import { forwardRef } from "react";
import { TreeSelect } from "antd";
export const BTreeSelect = forwardRef(function BTreeSelect({ showSearch = true, ...rest }, ref) {
    return _jsx(TreeSelect, { ref: ref, showSearch: showSearch, ...rest });
});
//# sourceMappingURL=BTreeSelect.js.map