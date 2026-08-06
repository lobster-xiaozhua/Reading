import { Link } from "react-router-dom";
import { EmptyState } from "@novel/components";

export default function NotFoundPage() {
  return (
    <div
      className="container-page"
      style={{ padding: "var(--space-16) var(--space-4)" }}
    >
      <EmptyState
        title="404 页面走丢了"
        description="你访问的页面不存在，可能已被移除或链接错误。"
        action={
          <Link to="/" className="novel-btn novel-btn--primary">
            返回首页
          </Link>
        }
      />
    </div>
  );
}
