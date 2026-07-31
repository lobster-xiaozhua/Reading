import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTheme } from "../ThemeContext.jsx";
import "../styles/_topbar.css";

const SEARCH_HISTORY_KEY = "novel:search-history";
const MAX_HISTORY = 8;

function getSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addToHistory(term) {
  if (!term.trim()) return;
  try {
    const list = getSearchHistory().filter((t) => t !== term);
    list.unshift(term.trim());
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  } catch {
    /* ignore */
  }
}

function clearHistory() {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  if (location.pathname.includes("/read/")) return null;

  // 聚焦时读取历史
  useEffect(() => {
    if (focused) {
      setHistory(getSearchHistory());
    }
  }, [focused]);

  // 点击外部关闭建议
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 键盘导航
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, history.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter" && selectedIdx >= 0 && history[selectedIdx]) {
        e.preventDefault();
        const term = history[selectedIdx];
        setQ(term);
        addToHistory(term);
        navigate(`/search?q=${encodeURIComponent(term)}`);
        setFocused(false);
        setSelectedIdx(-1);
      } else if (e.key === "Escape") {
        setFocused(false);
        setSelectedIdx(-1);
      }
    },
    [history, selectedIdx, navigate]
  );

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (term) addToHistory(term);
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
    setFocused(false);
  };

  const handleHistoryClick = (term) => {
    setQ(term);
    addToHistory(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setFocused(false);
  };

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <header className="topbar" role="banner">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="云笈阁 首页">
          云笺<span>读</span>
        </Link>

        <div className="topbar-search-wrapper" ref={searchRef}>
          <form className="topbar-search" onSubmit={submit} role="search" aria-label="搜索书籍">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSelectedIdx(-1);
              }}
              onFocus={() => setFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="搜索书名、作者或正文…"
              aria-label="搜索"
              autoComplete="off"
            />
            <button type="submit" className="search-submit">
              搜索
            </button>
          </form>

          {/* 搜索建议下拉 */}
          {focused && history.length > 0 && !q.trim() && (
            <div className="search-suggestions">
              <div className="search-suggestions-head">
                <span>搜索历史</span>
                <button
                  type="button"
                  className="search-suggestions-clear"
                  onClick={() => {
                    clearHistory();
                    setHistory([]);
                  }}
                >
                  清空
                </button>
              </div>
              <ul className="search-suggestions-list">
                {history.map((term, i) => (
                  <li key={term}>
                    <button
                      type="button"
                      className={`search-suggestions-item ${i === selectedIdx ? "selected" : ""}`}
                      onClick={() => handleHistoryClick(term)}
                      onMouseEnter={() => setSelectedIdx(-1)}
                    >
                      <span className="search-suggestions-icon">🕐</span>
                      <span>{term}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <nav className="topbar-nav" aria-label="主导航">
          <Link
            to="/"
            className={`nav-link ${isActive("/") && !isActive("/shelf") ? "active" : ""}`}
            aria-current={isActive("/") && !isActive("/shelf") ? "page" : undefined}
          >
            发现
          </Link>
          <Link
            to="/shelf"
            className={`nav-link ${isActive("/shelf") ? "active" : ""}`}
            aria-current={isActive("/shelf") ? "page" : undefined}
          >
            书架
          </Link>
          <Link
            to="/admin"
            className={`nav-link ${isActive("/admin") ? "active" : ""}`}
            aria-current={isActive("/admin") ? "page" : undefined}
          >
            管理
          </Link>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "切换暗色模式" : "切换亮色模式"}
            title={theme === "light" ? "暗色模式" : "亮色模式"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </nav>
      </div>
    </header>
  );
}