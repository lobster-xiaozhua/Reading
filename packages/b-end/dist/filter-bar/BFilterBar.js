import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * P2-2 · FilterBar 筛选栏
 * searchKey 受控 + filters[] + advancedFilters Drawer + collapsible
 * 筛选状态高亮 --color-brand
 * Source: 04 §6.2
 * ============================================================ */
import { forwardRef, useState, useMemo } from "react";
import { Input, Button, Space, Drawer, Form, Badge } from "antd";
import { SearchOutlined, FilterOutlined, DownOutlined, UpOutlined, ReloadOutlined, } from "@ant-design/icons";
/**
 * B 端筛选栏
 * - 左侧搜索 + 常规筛选
 * - 右侧高级筛选 Drawer + 重置 + 额外操作
 * - 有筛选条件时高级筛选按钮高亮（Badge 红点）
 */
export const BFilterBar = forwardRef(function BFilterBar({ searchKey, onSearch, searchPlaceholder = "请输入关键词搜索", filters = [], advancedFilters = [], advancedValues, onAdvancedConfirm, onReset, extra, collapsible = false, defaultExpanded = false, }, ref) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [form] = Form.useForm();
    const visibleFilters = useMemo(() => {
        if (!collapsible)
            return filters;
        return expanded ? filters : filters.slice(0, 2);
    }, [filters, collapsible, expanded]);
    const advancedCount = useMemo(() => {
        if (!advancedValues)
            return 0;
        return Object.values(advancedValues).filter((v) => v !== undefined &&
            v !== null &&
            v !== "" &&
            !(Array.isArray(v) && v.length === 0)).length;
    }, [advancedValues]);
    const handleAdvancedConfirm = async () => {
        const values = await form.validateFields();
        onAdvancedConfirm?.(values);
        setDrawerOpen(false);
    };
    return (_jsxs("div", { ref: ref, className: "b-filter-bar", style: {
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            flexWrap: "wrap",
            marginBottom: "var(--space-4)",
        }, children: [_jsx(Input, { value: searchKey, onChange: (e) => onSearch?.(e.target.value), placeholder: searchPlaceholder, prefix: _jsx(SearchOutlined, { style: { color: "var(--color-text-tertiary)" } }), allowClear: true, style: { width: 240 }, onPressEnter: (e) => onSearch?.(e.target.value), "aria-label": "\u641C\u7D22" }), visibleFilters.map((field) => (_jsxs("div", { className: "b-filter-bar__field", style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                }, children: [_jsx("label", { style: {
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--font-size-body, 14px)",
                            whiteSpace: "nowrap",
                        }, children: field.label }), field.control] }, field.name))), collapsible && filters.length > 2 && (_jsxs(Button, { type: "link", onClick: () => setExpanded((v) => !v), "aria-label": expanded ? "收起筛选" : "展开筛选", children: [expanded ? _jsx(UpOutlined, {}) : _jsx(DownOutlined, {}), expanded ? "收起" : "展开"] })), _jsxs("div", { style: {
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                }, children: [advancedFilters.length > 0 && (_jsx(Badge, { count: advancedCount, size: "small", offset: [-4, 4], children: _jsx(Button, { icon: _jsx(FilterOutlined, {}), onClick: () => setDrawerOpen(true), children: "\u9AD8\u7EA7\u7B5B\u9009" }) })), onReset && (_jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: onReset, "aria-label": "\u91CD\u7F6E\u7B5B\u9009", children: "\u91CD\u7F6E" })), extra] }), _jsx(Drawer, { title: "\u9AD8\u7EA7\u7B5B\u9009", open: drawerOpen, onClose: () => setDrawerOpen(false), width: 400, extra: _jsxs(Space, { children: [_jsx(Button, { onClick: () => setDrawerOpen(false), children: "\u53D6\u6D88" }), _jsx(Button, { type: "primary", onClick: handleAdvancedConfirm, children: "\u786E\u5B9A" })] }), children: _jsx(Form, { form: form, layout: "vertical", initialValues: advancedValues, children: advancedFilters.map((field) => (_jsx(Form.Item, { name: field.name, label: field.label, children: field.control }, field.name))) }) })] }));
});
//# sourceMappingURL=BFilterBar.js.map