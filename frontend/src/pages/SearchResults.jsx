import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchSearch } from "../api.ts";
import SearchPagination from "../components/SearchPagination.jsx";
import "../styles/_search.css";

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ["em", "strong", "b", "i", "mark", "span", "br"],
  ALLOWED_ATTR: [],
};

// 懒加载 DOMPurify，只在使用时导入
let purifyPromise = null;
function getPurify() {
  if (!purifyPromise) {
    purifyPromise = import("dompurify");
  }
  return purifyPromise;
}

function Highlight({ html }) {
  const [safeHtml, setSafeHtml] = useState("");

  useEffect(() => {
    getPurify().then((mod) => {
      setSafeHtml(mod.default.sanitize(html, SANITIZE_CONFIG));
    });
  }, [html]);

  return <span dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const page = parseInt(params.get("page") || "1", 10);
  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedBooks, setExpandedBooks] = useState(new Set());
  const [expandedChapters, setExpandedChapters] = useState({});
  const [tab, setTab] = useState("all");

  const toggleChapter = (bid, chapterId) => {
    setExpandedChapters((prev) => {
      const next = { ...prev };
      if (!next[bid]) next[bid] = new Set();
      else next[bid] = new Set(next[bid]);
      if (next[bid].has(chapterId)) next[bid].delete(chapterId);
      else next[bid].add(chapterId);
      return next;
    });
  };

  useEffect(() => {
    if (!q.trim()) {
      setBooks([]);
      setChapters([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError("");
    fetchSearch(q, page, ac.signal)
      .then((data) => {
        setBooks(data.books || []);
        setChapters(data.chapters || []);
        setTotal(data.total || 0);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message || "搜索服务不可用（需启动 Meilisearch）");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [q, page]);

  const toggleBook = (bid) => {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(bid)) next.delete(bid);
      else next.add(bid);
      return next;
    });
  };

  const goPage = (p) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    setParams(next);
  };

  return (
    <div className="container-narrow page-enter search-page">
      <header className="search-header">
        <h1 className="h1 search-h1">搜索结果</h1>
        <p className="subtitle">
          关键词：<b className="search-keyword">{q}</b>
          {total > 0 && <span className="search-count">共 {total} 条</span>}
        </p>
        {!loading && !error && (books.length > 0 || chapters.length > 0) && (
          <div className="search-tabs">
            <button
              className={`search-tab ${tab === "all" ? "active" : ""}`}
              onClick={() => setTab("all")}
            >
              全部 {books.length + chapters.length}
            </button>
            <button
              className={`search-tab ${tab === "books" ? "active" : ""}`}
              onClick={() => setTab("books")}
              disabled={books.length === 0}
            >
              书籍 {books.length}
            </button>
            <button
              className={`search-tab ${tab === "chapters" ? "active" : ""}`}
              onClick={() => setTab("chapters")}
              disabled={chapters.length === 0}
            >
              章节 {chapters.length}
            </button>
          </div>
        )}
      </header>

      {loading && (
        <div className="search-loading" aria-live="polite">
          正在检索内容…
        </div>
      )}
      {error && (
        <div className="search-error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && books.length === 0 && chapters.length === 0 && (
        <div className="search-empty">
          <h3 className="search-empty-title">没有找到与「{q}」相关的内容</h3>
          <p>建议：试试缩短关键词，或查看 <Link to="/" className="search-empty-link">全部书籍</Link></p>
        </div>
      )}

      {(tab === "all" || tab === "books") && books.length > 0 && (
        <section className="search-section">
          <h2 className="h2 search-section-title">
            书籍匹配 <span className="search-count">&middot; {books.length}</span>
          </h2>
          <div className="search-card-list">
            {books.map((b) => (
              <article key={b.id} className="card search-result-card">
                <div className="search-result-row">
                  <Link
                    to={`/book/${encodeURIComponent(b.id)}`}
                    className="search-result-title"
                  >
                    <Highlight html={b._formatted?.title || b.title} />
                  </Link>
                  <span className="search-result-author">
                    {b.author || "未知作者"}
                  </span>
                </div>
                <div className="search-result-meta">
                  <span className="search-result-match">
                    命中章节：{b._chapter_count || 0}
                  </span>
                  <button
                    onClick={() => toggleBook(b.id)}
                    className="btn btn-secondary search-result-btn"
                  >
                    {expandedBooks.has(b.id) ? "收起详情" : "展开详情"}
                  </button>
                </div>
                {expandedBooks.has(b.id) && (
                  <div className="search-result-expanded">
                    <h4>章节列表</h4>
                    <ul className="search-chapter-list">
                      {chapters
                        .filter((c) => {
                          const [bid] = c.id.split("__");
                          return bid === b.id;
                        })
                        .map((c) => {
                          const [bid, idxRaw] = c.id.split("__");
                          const chapterId = idxRaw || "001";
                          const isChapterExpanded = expandedChapters[b.id]?.has(chapterId);
                          return (
                            <li key={c.id} className="search-chapter-item">
                              <div className="search-chapter-row">
                                <Link
                                  to={`/book/${encodeURIComponent(b.id)}/read/${encodeURIComponent(chapterId)}?highlight=${encodeURIComponent(q)}`}
                                  className="search-chapter-link"
                                >
                                  {c.title}
                                </Link>
                                <button
                                  onClick={() => toggleChapter(b.id, chapterId)}
                                  className="btn btn-ghost search-chapter-btn"
                                >
                                  {isChapterExpanded ? "收起段落" : "展开段落"}
                                </button>
                              </div>
                              {isChapterExpanded && (
                                <div className="search-snippet-box">
                                  <p className="search-snippet-label">
                                    以下为关键词「{q}」在本章出现的上下文预览：
                                  </p>
                                  {b._chapter_snippets && b._chapter_snippets.length > 0 ? (
                                    b._chapter_snippets.map((snippet, sIdx) => (
                                      <div key={sIdx} className="search-snippet-text">
                                        <Highlight html={snippet.snippet} />
                                      </div>
                                    ))
                                  ) : (
                                    <div className="search-snippet-empty">无可显示的关键词上下文</div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {(tab === "all" || tab === "chapters") && chapters.length > 0 && (
        <section>
          <h2 className="h2 search-section-title">
            章节全文匹配 <span className="search-count">&middot; {chapters.length}</span>
          </h2>
          <div className="search-chapter-list-view">
            {chapters.map((c) => {
              const [bid, idxRaw] = c.id.split("__");
              const chapterId = idxRaw || "001";
              return (
                <Link
                  key={c.id}
                  to={`/book/${encodeURIComponent(bid)}/read/${encodeURIComponent(chapterId)}?highlight=${encodeURIComponent(q)}`}
                  className="card search-chapter-card"
                >
                  <div className="search-chapter-book">
                    《{c.book_title || "未知书籍"}》
                  </div>
                  <div className="search-chapter-title">
                    <Highlight html={c._formatted?.title || c.title} />
                  </div>
                  {c._formatted?.content && (
                    <div className="search-chapter-preview">
                      <Highlight html={c._formatted.content} />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <SearchPagination page={page} total={total} perPage={20} onChange={goPage} />
    </div>
  );
}