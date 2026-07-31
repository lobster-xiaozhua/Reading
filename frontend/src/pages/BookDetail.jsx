import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchBookDetail, coverUrl, apiAddFavorite, apiRemoveFavorite } from "../api.ts";
import { useAuth } from "../auth.jsx";
import { useToast } from "../ToastContext.jsx";
import {
  getBookProgress,
  isOnShelf,
  toggleShelf,
  formatRelative,
} from "../lib/localLibrary.js";
import CoverImage from "../components/CoverImage.jsx";
import { useRequest } from "../hooks/useRequest.js";
import "../styles/_book-detail.css";
import "../styles/_cards.css";

export default function BookDetail() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showToast = useToast();
  const [query, setQuery] = useState("");
  const [onShelf, setOnShelf] = useState(false);
  const [progress, setProgress] = useState(null);

  const { data: book, loading, error } = useRequest(
    (signal) => fetchBookDetail(bookId, signal),
    [bookId]
  );

  // 同步书架状态
  useEffect(() => {
    if (book) {
      setOnShelf(isOnShelf(book.id));
      setProgress(getBookProgress(book.id));
    }
  }, [book]);

  const volumes = useMemo(() => {
    const chapters = book?.chapters || [];
    const result = [];
    let current = null;
    for (const c of chapters) {
      const m = c.title.match(/^(第?[一二三四五六七八九十百零0-9]+[卷部季篇]).*?[:：]?/);
      if (m && !c.title.includes("章")) {
        current = { title: c.title, chapters: [] };
        result.push(current);
      } else {
        if (!current) {
          current = { title: "正文", chapters: [] };
          result.push(current);
        }
        current.chapters.push(c);
      }
    }
    return result;
  }, [book]);

  const filtered = useMemo(() => {
    if (!query.trim()) return volumes;
    const q = query.trim().toLowerCase();
    return volumes
      .map((v) => ({
        ...v,
        chapters: v.chapters.filter((c) => c.title.toLowerCase().includes(q)),
      }))
      .filter((v) => v.chapters.length > 0);
  }, [volumes, query]);

  const onToggleShelf = async () => {
    if (user) {
      try {
        if (onShelf) {
          await apiRemoveFavorite(book.id);
          showToast("已移出书架", "info");
        } else {
          await apiAddFavorite(book.id);
          showToast("已加入书架", "success");
        }
        setOnShelf(!onShelf);
      } catch (e) {
        showToast(e.message, "error");
      }
    } else {
      const now = toggleShelf(book);
      setOnShelf(now);
      showToast(now ? "已加入书架" : "已移出书架", now ? "success" : "info");
    }
  };

  const startRead = () => {
    const firstChapter = book.chapters?.[0];
    const resumeChapter =
      progress && book.chapters?.some((c) => c.id === progress.chapterId)
        ? progress
        : null;
    if (resumeChapter) {
      navigate(`/book/${encodeURIComponent(book.id)}/read/${encodeURIComponent(resumeChapter.chapterId)}`);
    } else if (firstChapter) {
      navigate(`/book/${encodeURIComponent(book.id)}/read/${encodeURIComponent(firstChapter.id)}`);
    }
  };

  if (loading)
    return (
      <div className="container-narrow" style={{ paddingTop: "100px", textAlign: "center", color: "var(--text-muted)" }}>
        正在加载书籍信息…
      </div>
    );
  if (error)
    return (
      <div className="container-narrow" style={{ paddingTop: "100px", textAlign: "center", color: "#ef4444" }}>
        {error}
      </div>
    );
  if (!book) return null;

  const firstChapter = book.chapters?.[0];
  const totalChapters = book.chapters?.length || 0;
  const resumeChapter =
    progress && book.chapters?.some((c) => c.id === progress.chapterId)
      ? progress
      : null;

  return (
    <div className="container-narrow book-detail-page page-enter">
      <nav className="back-nav">
        <Link to="/"><span>←</span> 返回书架</Link>
      </nav>

      <article className="card book-detail-card book-detail-hero">
        <div className="book-detail-layout">
          <div className="book-detail-cover">
            {book.cover ? (
              <CoverImage src={coverUrl(book.id)} alt={book.title} fallbackText={book.title.slice(0, 1)} />
            ) : (
              <span className="cover-placeholder-modern">{book.title.slice(0, 1)}</span>
            )}
          </div>
          <header className="book-detail-info">
            <h1 className="h1 book-detail-title">{book.title}</h1>
            <p className="book-detail-author">{book.author || "未知作者"}</p>
            {book.tags && book.tags.length > 0 && (
              <div className="book-detail-tags">
                {book.tags.map((t) => (
                  <span key={t} className="tag-chip">{t}</span>
                ))}
              </div>
            )}
            <p className="book-detail-desc">{book.description || "暂无简介"}</p>

            <div className="book-detail-meta">
              <div>
                <span className="meta-num">{totalChapters}</span>
                <span className="meta-label">章节</span>
              </div>
              <div>
                <span className="meta-num">
                  {book.word_count
                    ? book.word_count >= 10000
                      ? (book.word_count / 10000).toFixed(1) + "万"
                      : book.word_count
                    : "—"}
                </span>
                <span className="meta-label">字数</span>
              </div>
              {book.updated_at && (
                <div>
                  <span className="meta-num" style={{ fontSize: "14px" }}>{book.updated_at.slice(0, 10)}</span>
                  <span className="meta-label">更新</span>
                </div>
              )}
            </div>

            <div className="book-detail-actions">
              {firstChapter && (
                <button className="btn btn-primary book-detail-read" onClick={startRead}>
                  {resumeChapter ? "继续阅读" : "开始阅读"}
                </button>
              )}
              <button
                type="button"
                className={`btn ${onShelf ? "btn-secondary" : "btn-ghost"}`}
                onClick={onToggleShelf}
              >
                {onShelf ? "★ 已在书架" : "☆ 加入书架"}
              </button>
            </div>
            {resumeChapter && (
              <p className="resume-hint">
                上次读到「{resumeChapter.title || resumeChapter.chapterId}」·{" "}
                {Math.round((resumeChapter.progress || 0) * 100)}% ·{" "}
                {formatRelative(resumeChapter.at)}
              </p>
            )}
          </header>
        </div>
      </article>

      <section className="toc-section">
        <div className="toc-head">
          <h2 className="h2">
            目录 <span className="toc-count">· {totalChapters} 章</span>
          </h2>
          {totalChapters > 8 && (
            <input
              className="input toc-search"
              placeholder="搜索章节…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>没有匹配的章节</p>
          </div>
        )}

        <div className="card toc-card">
          {filtered.map((vol, vi) => (
            <div key={vi} className="toc-volume">
              {vol.title !== "正文" && <div className="toc-volume-title">{vol.title}</div>}
              <ul className="toc-list">
                {vol.chapters.map((c) => {
                  const globalIdx = book.chapters.indexOf(c);
                  const isCurrent = resumeChapter?.chapterId === c.id;
                  return (
                    <li key={c.id} className={`toc-item ${isCurrent ? "toc-current" : ""}`}>
                      <Link to={`/book/${encodeURIComponent(book.id)}/read/${encodeURIComponent(c.id)}`}>
                        <span className="toc-chapter-title">
                          {isCurrent && <span className="toc-badge">续</span>}
                          {c.title}
                        </span>
                        <span className="toc-chapter-num">第 {globalIdx + 1} 章</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}