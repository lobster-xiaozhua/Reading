import { Outlet } from "react-router-dom";

/**
 * 阅读器独立全屏布局
 * 不含 NavBar/Footer，正文区最大化退让（03 §5.3）
 */
export function ReaderLayout() {
  return (
    <div className="reader-layout" style={{ minHeight: "100vh" }}>
      <Outlet />
    </div>
  );
}
