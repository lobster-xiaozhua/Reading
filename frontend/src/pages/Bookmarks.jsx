import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAllBookmarks, getBookmarks, removeBookmark, getHistory } from "../lib/localLibrary.js";
import { formatRelative } from "../lib/localLibrary.js";
import "../styles/_bookmarks.css";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState([]);
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState("book"); // "book" or "time"

  const refresh = () => {
    setBookmarks(getAllBookmarks());
  };

  useEffect(() => {
    refresh();
  }, []);

  // 按书籍分组
  const grouped = useMemo(() => {
    const filtered = search.trim()
      ? bookmarks.filter((bm) =>
          (bm.title || "").toLowerCase().includes(search.toLowerCase()) ||
          (bm.bookId || "").toLowerCase().includes(search.toLowerCase()) ||
          (bm.note || "").toLowerCase().includes(search.toLowerCase())
        )
      : bookmarks;

    if (groupBy === "time") {
      return [{ title: "全部书签", items: filtered }];
    }

    const map = new Map();
    filtered.forEach((bm) => {
      const key = bm.bookId || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(bm);
    });
    // 从 history 中获取书名
    const history = getHistory();
    return Array.from(map.entries())
      .map(([bookId, items]) => {
        const h = history.find((h) => h.bookId === bookId);
        return { title: h?.bookTitle || bookId, bookId, items };
      })
      .sort((a, b) => b.items.length - a.items.length);
  }, [bookmarks, search, groupBy]);

  const handleDelete = (bookId, bmId) => {
    removeBookmark(bookId, bmId);
    refresh();
  };

  return (
    <div className="container-narrow page-enter" style={{ paddingTop: "var(--spacing-xxl)", paddingBottom: "var(--spacing-xxl)" }}>
      <header className="page-header-modern">
        <div className="bm-head-row">
          <div>
            <h1 className="h1">书签夹</h1>
            <p className="subtitle">共 {bookmarks.length} 个书签</p>
          </div>
          <Link to="/" className="btn btn-ghost" style={{ fontSize: "13px" }}>← 返回</Link>
        </div>
      </header>

      {/* 搜索 + 分组切换 */}
      <div className="bm-toolbar">
        <input
          className="input bm-search"
          type="text"
          placeholder="搜索书签…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="搜索书签"
        />
        <div className="bm-group-toggle">
          <button
            type="button"
            className={`sort-tab ${groupBy === "book" ? "active" : ""}`}
            onClick={() => setGroupBy("book")}
          >
            按书籍
          </button>
          <button
            type="button"
            className={`sort-tab ${groupBy === "time" ? "active" : ""}`}
            onClick={() => setGroupBy("time")}
          >
            按时间
          </button>
        </div>
      </div>

      {/* 书签列表 */}
      {bookmarks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔖</div>
          <p>还没有书签</p>
          <span className="empty-hint">阅读时按 B 键或点工具栏「书签」添加</span>
        </div>
      ) : grouped.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>没有匹配的书签</p>
        </div>
      ) : (
        <div className="bm-groups">
          {grouped.map((group) => (
            <section key={group.bookId || group.title} className="bm-group">
              <h2 className="bm-group-title">
                {group.title}
                <span className="bm-group-count">{group.items.length}</span>
              </h2>
              <div className="bm-list">
                {group.items.map((bm) => (
                  <div key={bm.id} className="card bm-item">
                    <div className="bm-item-main">
                      <Link
                        to={`/book/${encodeURIComponent(bm.bookId)}/read/${encodeURIComponent(bm.chapterId)}`}
                        className="bm-item-link"
                      >
                        <span className="bm-item-title">{bm.title || bm.chapterId}</span>
                        <span className="bm-item-meta">{formatRelative(bm.at)}</span>
                      </Link>
                      {bm.note && <p className="bm-item-note">{bm.note}</p>}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost bm-item-del"
                      onClick={() => handleDelete(bm.bookId, bm.id)}
                      aria-label="删除书签"
                      title="删除"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}