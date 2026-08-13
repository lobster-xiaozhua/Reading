import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * P2-4 · BatchActionBar 批量操作栏
 * selectedCount + actions[] + visible + onClear
 * 底部固定浮出 --dur-normal 240ms + --sh-4；危险操作 type='danger' + confirm
 * Source: 04 §6.5
 * ============================================================ */
import { forwardRef } from "react";
import { Button, Space, Modal } from "antd";
/**
 * B 端批量操作栏
 * - 选中行 > 0 时底部固定浮出
 * - 浮出动画 --dur-normal 240ms
 * - 阴影 --sh-4
 * - 危险操作二次确认
 */
export const BBatchActionBar = forwardRef(function BBatchActionBar({ selectedCount, actions, visible, onClear }, ref) {
    if (!visible || selectedCount === 0)
        return null;
    const handleAction = (action) => {
        if (action.confirmTitle) {
            Modal.confirm({
                title: action.confirmTitle,
                content: action.confirmContent,
                okType: action.danger ? "danger" : "primary",
                okText: "确认",
                cancelText: "取消",
                onOk: action.onClick,
            });
        }
        else {
            action.onClick();
        }
    };
    return (_jsxs("div", { ref: ref, className: "b-batch-action-bar", style: {
            position: "fixed",
            bottom: "var(--space-5)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "var(--color-bg-elevated)",
            borderRadius: "var(--radius-md, 8px)",
            boxShadow: "var(--sh-4)",
            padding: "var(--space-3) var(--space-5)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            animation: "b-batch-slide-in var(--dur-normal, 240ms) var(--ease-out, ease-out)",
        }, role: "toolbar", "aria-label": `批量操作栏，已选 ${selectedCount} 项`, children: [_jsxs("span", { style: { color: "var(--color-text-primary)", fontWeight: 500 }, children: ["\u5DF2\u9009", " ", _jsx("span", { style: { color: "var(--color-brand)" }, children: selectedCount }), " ", "\u9879"] }), _jsx(Space, { size: "small", children: actions.map((action) => (_jsx(Button, { type: action.type ?? "default", danger: action.danger, disabled: action.disabled, onClick: () => handleAction(action), children: action.label }, action.key))) }), _jsx(Button, { type: "text", size: "small", onClick: onClear, "aria-label": "\u6E05\u9664\u9009\u62E9", children: "\u6E05\u9664" }), _jsx("style", { children: `
          @keyframes b-batch-slide-in {
            from { transform: translateX(-50%) translateY(100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        ` })] }));
});
//# sourceMappingURL=BBatchActionBar.js.map