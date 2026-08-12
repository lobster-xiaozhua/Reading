import { type ReactNode } from "react";
export type AlertType = "success" | "warning" | "error" | "info";
export interface AlertProps {
    type?: AlertType;
    message: ReactNode;
    description?: ReactNode;
    closable?: boolean;
    onClose?: () => void;
}
export declare function Alert({ type, message, description, closable, onClose, }: AlertProps): import("react").JSX.Element | null;
interface FeedbackContextValue {
    message: (type: AlertType, content: ReactNode, duration?: number) => void;
    notification: (opts: {
        type?: AlertType;
        title: ReactNode;
        description?: ReactNode;
        duration?: number;
    }) => void;
}
/** Provider 应在应用根节点包裹 */
export declare function FeedbackProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
/** Hook：消费 message / notification 命令式 API */
export declare function useFeedback(): FeedbackContextValue;
/**
 * 命令式 message 入口（需要应用根已挂 FeedbackProvider）。
 * 用法：const { message } = useFeedback(); message.success('已保存');
 */
export declare function createMessageApi(ctx: FeedbackContextValue): {
    success: (content: ReactNode, duration?: number) => void;
    warning: (content: ReactNode, duration?: number) => void;
    error: (content: ReactNode, duration?: number) => void;
    info: (content: ReactNode, duration?: number) => void;
};
export declare function createNotificationApi(ctx: FeedbackContextValue): {
    open: (opts: Parameters<FeedbackContextValue["notification"]>[0]) => void;
    success: (title: ReactNode, description?: ReactNode, duration?: number) => void;
    warning: (title: ReactNode, description?: ReactNode, duration?: number) => void;
    error: (title: ReactNode, description?: ReactNode, duration?: number) => void;
    info: (title: ReactNode, description?: ReactNode, duration?: number) => void;
};
export {};
//# sourceMappingURL=Alert.d.ts.map