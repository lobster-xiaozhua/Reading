import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { coverUrl, apiFavorites, apiGetProgress } from "../api.ts";
import { useAuth } from "../auth.jsx";
import {
  getShelf,
  getHistory,
  removeFromShelf,
  clearHistory,
  formatRelative,
} from "../lib/localLibrary.js";
import { BookCardSkeletonGrid } from "../components/BookCardSkeleton.jsx";
import CoverImage from "../components/CoverImage.jsx";
import "../styles/_shelf.css";
import "../styles/_cards.css";

export default function Shelf() {
  const { user } = useAuth();
  const [tab, setTab] = useState("continue");
  const [localShelf, setLocalShelf] = useState([]);
  const [history, setHistory] = useState([]);
  const [cloudFavs, setCloudFavs] = useState([]);
  const [cloudProgress, setCloudProgress] = useState([]);

  const refresh = useCallback((signal) => {
    setLocalShelf(getShelf());
    setHistory(getHistory());
    if (user) {
      apiFavorites(signal).then(setCloudFavs).catch(() => {});
      apiGetProgress(signal).then(setCloudProgress).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const ac = new AbortController();
    refresh(ac.signal);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      ac.abort();
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const onClearHistory = () => {
    if (!confirm("清空全部阅读历史？")) return;
    clearHistory();
    refresh();
  };

  const mergedHistory = history.map((h) => {
    const cloud = cloudProgress.find((p) => p.book_id === h.bookId);
    return cloud && new Date(cloud.updated_at) > new Date(h.at)
      ? { ...h, chapterId: cloud.chapter_id, progress: cloud.progress, at: cloud.updated_at }
      : h;
  });

  return (
    <div className="container shelf-page page-enter">
      <header className="page-header-modern">
        <h1 className="h1">我的书架</h1>
        <p className="subtitle">
          {user ? "进度已同步到云端" : "收藏与阅读进度保存在本机，登录后可同步"}
        </p>
      </header>

      <div className="shelf-tabs">
        <button
          type="button"
          className={`sort-tab ${tab === "continue" ? "active" : ""}`}
          onClick={() => setTab("continue")}
        >
          继续阅读 · {mergedHistory.length}
        </button>
        <button
          type="button"
          className={`sort-tab ${tab === "shelf" ? "active" : ""}`}
          onClick={() => setTab("shelf")}
        >
          已收藏 · {localShelf.length + (user ? cloudFavs.length : 0)}
        </button>
        {tab === "continue" && mergedHistory.length > 0 && (
          <button type="button" className="btn btn-ghost shelf-clear" onClick={onClearHistory}>
            清空历史
          </button>
        )}
      </div>

      {tab === "continue" && (
        <section className="shelf-section">
          {mergedHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📖</div>
              <p>还没有阅读记录</p>
              <span className="empty-hint">
                打开任意章节开始阅读，进度会自动出现在这里 ·{" "}
                <Link to="/">去发现好书</Link>
              </span>
            </div>
          ) : (
            <div className="shelf-list">
              {mergedHistory.map((h) => (
                <Link
                  key={h.bookId}
                  to={`/book/${encodeURIComponent(h.bookId)}/read/${encodeURIComponent(h.chapterId)}`}
                  className="card shelf-row"
                >
                  <div className="shelf-row-main">
                    <div className="shelf-row-title">{h.bookTitle || h.bookId}</div>
                    <div className="shelf-row-sub">
                      {h.title || h.chapterId}
                      <span className="stat-divider">·</span>
                      {formatRelative(h.at)}
                    </div>
                  </div>
                  <div className="shelf-row-progress">
                    <div className="mini-progress">
                      <div
                        className="mini-progress-fill"
                        style={{ width: `${Math.round((h.progress || 0) * 100)}%` }}
                      />
                    </div>
                    <span>{Math.round((h.progress || 0) * 100)}%</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "shelf" && (
        <section className="shelf-section">
          {localShelf.length === 0 && (!user || cloudFavs.length === 0) ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p>书架空空如也</p>
              <span className="empty-hint">
                在书籍详情页点击「加入书架」 · <Link to="/">去发现</Link>
              </span>
            </div>
          ) : (
            <div className="grid grid-3">
              {(user ? cloudFavs : localShelf).map((b) => {
                const prog = mergedHistory.find((h) => h.bookId === b.id || h.bookId === b.bookId);
                const bid = b.id || b.bookId;
                const href = prog
                  ? `/book/${encodeURIComponent(bid)}/read/${encodeURIComponent(prog.chapterId)}`
                  : `/book/${encodeURIComponent(bid)}`;
                return (
                  <div key={bid} className="card book-card-modern shelf-card">
                    <Link to={href} className="shelf-card-link">
                      <div className="book-cover-modern" aria-hidden>
                        {b.cover ? (
                          <CoverImage src={coverUrl(bid)} alt={b.title} fallbackText={(b.title || "?").slice(0, 1)} />
                        ) : (
                          <span className="cover-placeholder-modern">{(b.title || "?").slice(0, 1)}</span>
                        )}
                      </div>
                      <div className="book-meta-modern">
                        <h3 className="book-title-modern">{b.title}</h3>
                        <p className="book-author-modern">{b.author || "未知作者"}</p>
                        {prog && (
                          <div className="shelf-card-prog">
                            读到 {prog.title || "…"} · {Math.round((prog.progress || 0) * 100)}%
                          </div>
                        )}
                      </div>
                    </Link>
                    {!user && (
                      <button
                        type="button"
                        className="btn btn-ghost shelf-remove"
                        onClick={() => {
                          removeFromShelf(b.bookId);
                          refresh();
                        }}
                      >
                        移出书架
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}