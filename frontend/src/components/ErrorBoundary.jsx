import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback || "页面出现异常";
      return (
        <div
          className="empty-state"
          role="alert"
          style={{ padding: "80px 20px", minHeight: "40vh" }}
        >
          <div className="empty-icon" style={{ fontSize: "48px" }}>
            ⚠️
          </div>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>{fallback}</p>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-subtle)",
              marginBottom: "16px",
            }}
          >
            {this.state.error?.message || ""}
          </p>
          <button
            className="btn btn-primary"
            onClick={this.handleRetry}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}