import { useLocation, useOutlet } from "react-router-dom";

/**
 * B 端页面过渡出口
 * 基于当前路由 pathname 作为 key，触发淡入上移动画。
 * 避免 Modal / Drawer 等浮层组件 unmount 时的不必要动画。
 */
export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <div key={location.pathname} className="b-page-fade-in">
      {outlet}
    </div>
  );
}