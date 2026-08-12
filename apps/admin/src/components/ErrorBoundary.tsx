/* ============================================================
 * P0-17 · 错误边界
 * - 捕获未处理异常，避免白屏
 * - 提供重试与返回工作台入口
 * ============================================================ */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "antd";
import { BrandResult } from "./BrandResult";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, errorInfo, {
      tagged: "initErrorMonitor",
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReset = () => {
    this.handleRetry();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <BrandResult
          status="500"
          title="页面出错了"
          subTitle={this.state.error?.message || "发生未知错误，请稍后重试。"}
          extra={
            <Button type="primary" onClick={this.handleReset}>
              重试
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
