/** 节点状态 */
export type FlowNodeStatus = "waiting" | "processing" | "approved" | "rejected";
/** 流程节点 */
export interface SettlementFlowNode {
    key: string;
    title: string;
    description: string;
    status: FlowNodeStatus;
}
export interface SettlementFlowProps {
    /** 流程节点；不传则使用默认结算流程 */
    nodes?: SettlementFlowNode[];
    /** 当前激活节点 index（可选，覆盖 nodes 内 status） */
    current?: number;
    /** 根容器 className */
    className?: string;
}
/** 默认结算流程（P8-2-5） */
export declare const DEFAULT_SETTLEMENT_FLOW: SettlementFlowNode[];
/**
 * 结算流程图组件。
 * 横向 Steps 展示 6 节点，支持自定义节点或传入 current 高亮。
 */
export declare function SettlementFlow({ nodes, current, className, }: SettlementFlowProps): import("react").JSX.Element;
//# sourceMappingURL=SettlementFlow.d.ts.map