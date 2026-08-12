import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P8-2-5 · 结算流程图 SettlementFlow
 * 月初生成账单 → 待结算 → 财务核对 → 已结算 → 作者提现申请 → 已提现
 * 节点状态色：进行中/待审 warning / 通过/上架成功 success / 驳回 error（P8-3-3 同口径）
 * Source: 04 §13.2 / P8-2-5
 * ============================================================ */
import { Steps } from "antd";
import { LoadingOutlined, CheckCircleFilled, ClockCircleOutlined, CloseCircleFilled, } from "@ant-design/icons";
/** 默认结算流程（P8-2-5） */
export const DEFAULT_SETTLEMENT_FLOW = [
    {
        key: "generate",
        title: "月初生成账单",
        description: "系统按月汇总各作品字数与订阅收入，自动生成结算账单",
        status: "approved",
    },
    {
        key: "pending",
        title: "待结算",
        description: "账单进入待结算队列，等待财务核对",
        status: "approved",
    },
    {
        key: "verify",
        title: "财务核对",
        description: "财务确认字数口径与分成比例无误",
        status: "processing",
    },
    {
        key: "settled",
        title: "已结算",
        description: "金额计入作者余额，可发起提现",
        status: "waiting",
    },
    {
        key: "withdraw-request",
        title: "作者提现申请",
        description: "作者在 C 端发起提现申请",
        status: "waiting",
    },
    {
        key: "withdrawn",
        title: "已提现",
        description: "提现到账，流程结束",
        status: "waiting",
    },
];
/** 节点状态 → AntD Steps status 映射 */
function toStepStatus(s) {
    switch (s) {
        case "approved":
            return "finish";
        case "processing":
            return "process";
        case "rejected":
            return "error";
        case "waiting":
        default:
            return "wait";
    }
}
/** 节点状态图标 */
function statusIcon(s) {
    switch (s) {
        case "approved":
            return (_jsx(CheckCircleFilled, { style: { color: "var(--color-feedback-success)" } }));
        case "processing":
            return _jsx(LoadingOutlined, { style: { color: "var(--color-brand)" } });
        case "rejected":
            return (_jsx(CloseCircleFilled, { style: { color: "var(--color-feedback-error)" } }));
        case "waiting":
        default:
            return (_jsx(ClockCircleOutlined, { style: { color: "var(--color-text-tertiary)" } }));
    }
}
/**
 * 结算流程图组件。
 * 横向 Steps 展示 6 节点，支持自定义节点或传入 current 高亮。
 */
export function SettlementFlow({ nodes, current, className, }) {
    const list = nodes ?? DEFAULT_SETTLEMENT_FLOW;
    const activeIndex = current ??
        Math.max(0, list.findIndex((n) => n.status === "processing"));
    return (_jsx("div", { className: className, style: { padding: "var(--space-4)" }, children: _jsx(Steps, { current: activeIndex >= 0 ? activeIndex : list.length - 1, size: "small", labelPlacement: "vertical", items: list.map((n, idx) => ({
                title: n.title,
                description: n.description,
                status: idx === activeIndex && n.status === "processing"
                    ? "process"
                    : toStepStatus(n.status),
                icon: statusIcon(n.status),
            })) }) }));
}
//# sourceMappingURL=SettlementFlow.js.map