import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Dropdown, Avatar } from "@novel/components";
import { ActionSearch } from "@novel/icons";
import { useUserStore } from "@/stores/userStore";
import { fetcher } from "@/api/fetcher";
import { hoverPrefetch } from "@/utils/routePrefetchRegistry";
import type { Category } from "@/api/types";
import "./NavBar.css";

/**
 * 顶部导航栏（03 §5.1）
 * Logo + 搜索框 + 分类下拉 + 登录/头像
 */
export function NavBar() {
  const navigate = useNavigate();
  const user = useUserStore((s) => s.profile);
  const [keyword, setKeyword] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const categoriesRef = useRef<Category[]>([]);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    useUserStore.getState().loadUser();
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetcher.getCategories().then((cats) => {
        categoriesRef.current = cats;
        setCategories(cats);
      });
    }
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    navigate(`/search?q=${encodeURIComponent(keyword.trim())}`);
  };

  const categoryItems = useMemo(() => {
    return [
      { key: "all", label: "全部分类", to: "/category" },
      ...categories.map((c) => ({
        key: c.id,
        label: c.name,
        to: `/category?cat=${encodeURIComponent(c.name)}`,
      })),
    ];
  }, [categories]);

  return (
    <header className={`novel-navbar${scrolled ? " is-scrolled" : ""}`} role="banner">
      <div className="novel-navbar__inner container-page">
        <Link
          to="/"
          className="novel-navbar__logo"
          aria-label="Atlas 小说阅读 首页"
        >
          <span className="novel-navbar__logo-mark" aria-hidden>
            A
          </span>
          <span className="novel-navbar__logo-text">Atlas</span>
        </Link>

        <nav className="novel-navbar__nav" aria-label="主导航">
          <NavLink
            to="/"
            end
            className="novel-navbar__nav-link"
            onPointerEnter={hoverPrefetch("/discover")}
          >
            首页
          </NavLink>
          <Dropdown
            trigger="hover"
            items={categoryItems.map((c) => ({
              key: c.key,
              label: <Link to={c.to}>{c.label}</Link>,
            }))}
          >
            <NavLink
              to="/category"
              className="novel-navbar__nav-link"
              onPointerEnter={hoverPrefetch("/category")}
            >
              分类
            </NavLink>
          </Dropdown>
          <NavLink
            to="/search"
            className="novel-navbar__nav-link"
            onPointerEnter={hoverPrefetch("/search")}
          >
            搜索
          </NavLink>
        </nav>

        <form
          className="novel-navbar__search"
          role="search"
          onSubmit={onSearch}
        >
          <input
            type="search"
            className="novel-navbar__search-input"
            placeholder="搜索书名 / 作者 / 标签"
            aria-label="搜索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button
            type="submit"
            className="novel-navbar__search-btn"
            aria-label="搜索"
          >
            <ActionSearch size="sm" aria-hidden="true" />
            <span className="novel-navbar__search-btn-label">搜索</span>
          </button>
        </form>

        <div className="novel-navbar__user">
          {user ? (
            <Dropdown
              trigger="click"
              items={[
                { key: "profile", label: <Link to="/profile">个人中心</Link> },
                {
                  key: "bookshelf",
                  label: <Link to="/profile?tab=bookshelf">我的书架</Link>,
                },
                {
                  key: "history",
                  label: <Link to="/profile?tab=history">阅读历史</Link>,
                },
              ]}
            >
              <Link
                to="/profile"
                className="novel-navbar__avatar-link"
                aria-label={`${user.nickname} 的个人中心`}
              >
                <Avatar src={user.avatar} alt={user.nickname} size="sm" />
                <span className="novel-navbar__username">{user.nickname}</span>
              </Link>
            </Dropdown>
          ) : (
            <button
              type="button"
              className="novel-navbar__login-btn"
              onClick={() => navigate("/login")}
              onPointerEnter={hoverPrefetch("/login")}
            >
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
