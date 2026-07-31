import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/", label: "发现", icon: "🏠" },
  { path: "/shelf", label: "书架", icon: "📚" },
  { path: "/bookmarks", label: "书签", icon: "🔖" },
  { path: "/stats", label: "统计", icon: "📊" },
];

export default function BottomNav() {
  const location = useLocation();

  // 阅读器中隐藏底部导航
  if (location.pathname.includes("/read/")) return null;

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <nav className="bottom-nav" role="navigation" aria-label="底部导航">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`bottom-nav-item ${isActive(item.path) ? "active" : ""}`}
          aria-current={isActive(item.path) ? "page" : undefined}
        >
          <span className="bottom-nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}