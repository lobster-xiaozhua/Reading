import { Link } from "react-router-dom";
import { coverUrl } from "../api.ts";
import { getBookProgress } from "../lib/localLibrary.js";
import CoverImage from "./CoverImage.jsx";
import { useMemo } from "react";
import "../styles/_cards.css";

function formatWords(n) {
  if (!n) return "0 字";
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 万字`;
  return `${n} 字`;
}

function formatDate(s) {
  if (!s) return "";
  return s.slice(0, 10);
}

export default function BookCard({ book, view = "grid" }) {
  const coverText = book.title.slice(0, 1);
  const tags = book.tags || [];

  // 读取阅读进度
  const progress = useMemo(() => getBookProgress(book.id), [book.id]);
  const progressPct = progress ? Math.round((progress.progress || 0) * 100) : 0;

  if (view === "list") {
    return (
      <Link to={`/book/${encodeURIComponent(book.id)}`} className="book-row-modern">
        <div className="book-row-cover">
          {book.cover ? (
            <CoverImage src={coverUrl(book.id)} alt={book.title} fallbackText={coverText} />
          ) : (
            <span className="book-row-cover-ph">{coverText}</span>
          )}
        </div>
        <div className="book-row-info">
          <div className="book-row-title">{book.title}</div>
          <div className="book-row-author">{book.author || "未知作者"}</div>
          {tags.length > 0 && (
            <div className="book-tags-modern">
              {tags.slice(0, 3).map((t) => (
                <span key={t} className="tag-chip">
                  {t}
                </span>
              ))}
            </div>
          )}
          {progressPct > 0 && (
            <div className="book-row-progress-strip">
              <div className="mini-progress" style={{ width: "100px" }}>
                <div className="mini-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="book-row-progress-text">{progressPct}%</span>
            </div>
          )}
        </div>
        <div className="book-row-stats">
          <span>{book.chapter_count || 0} 章</span>
          <span className="stat-divider">·</span>
          <span>{formatWords(book.word_count)}</span>
          {book.updated_at && (
            <>
              <span className="stat-divider">·</span>
              <span>{formatDate(book.updated_at)}</span>
            </>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/book/${encodeURIComponent(book.id)}`} className="card book-card-modern">
      <div className="book-cover-modern" aria-hidden>
        {book.cover ? (
          <CoverImage src={coverUrl(book.id)} alt={book.title} fallbackText={coverText} />
        ) : (
          <span className="cover-placeholder-modern">{coverText}</span>
        )}
        {progressPct > 0 && (
          <div className="book-cover-progress-bar">
            <div className="book-cover-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>
      <div className="book-meta-modern">
        <h3 className="book-title-modern">{book.title}</h3>
        <p className="book-author-modern">{book.author || "未知作者"}</p>
        {tags.length > 0 && (
          <div className="book-tags-modern">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="tag-chip">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="book-stats-modern">
          <span className="stat-item">{book.chapter_count || 0} 章</span>
          <span className="stat-divider">·</span>
          <span className="stat-item">{formatWords(book.word_count)}</span>
          {book.updated_at && (
            <>
              <span className="stat-divider">·</span>
              <span className="stat-item">{formatDate(book.updated_at)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}