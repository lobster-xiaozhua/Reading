import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchDiscover, fetchBooks } from "../api.ts";
import { rangeToISO } from "../constants.ts";
import FilterBar from "../components/FilterBar.jsx";
import BookCard from "../components/BookCard.jsx";
import { BookCardSkeletonGrid, BookCardSkeletonList } from "../components/BookCardSkeleton.jsx";
import { getHistory, getShelf, formatRelative } from "../lib/localLibrary.js";
import { useRequest } from "../hooks/useRequest.js";
import "../styles/_discover.css";
import "../styles/_cards.css";
import "../styles/_shelf.css";

const QUICK_SORTS = [
  { value: "-updated_at", label: "最近更新" },
  { value: "-word_count", label: "字数最多" },
  { value: "title", label: "书名" },
];

export default function Discover() {
  const [selectedTags, setSelectedTags] = useState([]);
  const [wordMin, setWordMin] = useState("");
  const [wordMax, setWordMax] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [sort, setSort] = useState("-updated_at");
  const [view, setView] = useState("grid");
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [history, setHistory] = useState([]);

  // 使用 useRequest 替代手动 useEffect + AbortController
  const { data: allBooks, loading: booksLoading, error: booksError } = useRequest(
    (signal) => fetchBooks(signal),
    []
  );

  const { data: books, loading: discoverLoading, error: discoverError, refetch } = useRequest(
    (signal) => fetchDiscover({
      q: "",
      tags: selectedTags,
      word_min: wordMin ? parseInt(wordMin, 10) : null,
      word_max: wordMax ? parseInt(wordMax, 10) : null,
      updated_after: rangeToISO(timeRange),
      sort,
    }, signal),
    [selectedTags, wordMin, wordMax, timeRange, sort]
  );

  const loading = booksLoading || discoverLoading;
  const error = booksError || discoverError;

  useEffect(() => {
    setHistory(getHistory().slice(0, 6));
  }, []);

  const allTags = useMemo(() => {
    const map = new Map();
    (allBooks || []).forEach((b) => (b.tags || []).forEach((t) => map.set(t, (map.get(t) || 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [allBooks]);

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const clearFilters = () => {
    setSelectedTags([]);
    setWordMin("");
    setWordMax("");
    setTimeRange("");
    setSort("-updated_at");
  };

  const hasFilter =
    selectedTags.length || wordMin || wordMax || timeRange || sort !== "-updated_at";

  const totalWords = allBooks.reduce((s, b) => s + (b.word_count || 0), 0);

  const displayBooks = useMemo(() => {
    if (hasFilter || books.length === 0) return books;
    const arr = [...books];
    let seed = shuffleSeed || 1;
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [books, hasFilter, shuffleSeed]);

  const featured = history[0];

  // 根据书架标签推荐书籍
  const shelfBooks = useMemo(() => {
    const shelf = getShelf();
    if (shelf.length === 0 || allBooks.length === 0) return [];
    // 收集书架中书籍的标签
    const shelfTagSet = new Set();
    shelf.forEach((b) => (b.tags || []).forEach((t) => shelfTagSet.add(t)));
    if (shelfTagSet.size === 0) return [];
    // 找不在书架中且标签匹配的书籍
    const shelfIds = new Set(shelf.map((b) => b.bookId));
    const scored = allBooks
      .filter((b) => !shelfIds.has(b.id))
      .map((b) => {
        const matchCount = (b.tags || []).filter((t) => shelfTagSet.has(t)).length;
        return { book: b, score: matchCount };
      })
      .filter((b) => b.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    return scored.map((s) => s.book);
  }, [allBooks]);

  return (
    <div className="discover-page container page-enter">
      <header className="page-header-modern">
        <div className="brand-row">
          <div>
            <h1 className="h1">发现好书</h1>
            <p className="subtitle">免费在线书库 · 本机书架与进度 · 即时搜索</p>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-item">
              <span className="stat-bar-num">{allBooks.length}</span>
              <span className="stat-bar-label">本书</span>
            </div>
            <div className="stat-bar-divider" />
            <div className="stat-bar-item">
              <span className="stat-bar-num">
                {totalWords >= 10000 ? (totalWords / 10000).toFixed(1) + "万" : totalWords}
              </span>
              <span className="stat-bar-label">总字数</span>
            </div>
            <div className="stat-bar-divider" />
            <div className="stat-bar-item">
              <span className="stat-bar-num">{allTags.length}</span>
              <span className="stat-bar-label">标签</span>
            </div>
          </div>
        </div>
      </header>

      {featured && (
        <section className="continue-banner card">
          <div className="continue-banner-text">
            <span className="continue-label">继续阅读</span>
            <h2 className="continue-title">{featured.bookTitle || featured.bookId}</h2>
            <p className="continue-sub">
              {featured.title || featured.chapterId} · {Math.round((featured.progress || 0) * 100)}% ·{" "}
              {formatRelative(featured.at)}
            </p>
          </div>
          <div className="continue-banner-actions">
            <Link
              to={`/book/${encodeURIComponent(featured.bookId)}/read/${encodeURIComponent(featured.chapterId)}`}
              className="btn btn-primary"
            >
              接着读
            </Link>
            <Link to="/shelf" className="btn btn-ghost">
              我的书架
            </Link>
          </div>
          <div className="continue-banner-bar">
            <div style={{ width: `${Math.round((featured.progress || 0) * 100)}%` }} />
          </div>
        </section>
      )}

      {history.length > 1 && (
        <section className="recent-strip">
          <div className="recent-strip-head">
            <h3>最近在读</h3>
            <Link to="/shelf">全部</Link>
          </div>
          <div className="recent-strip-scroll">
            {history.slice(0, 6).map((h) => (
              <Link
                key={h.bookId}
                className="recent-chip"
                to={`/book/${encodeURIComponent(h.bookId)}/read/${encodeURIComponent(h.chapterId)}`}
              >
                <span className="recent-chip-title">{h.bookTitle || h.bookId}</span>
                <span className="recent-chip-meta">{Math.round((h.progress || 0) * 100)}%</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {allTags.length > 0 && (
        <div className="quick-tags">
          {allTags.slice(0, 12).map((t) => (
            <button
              key={t}
              type="button"
              className={`quick-tag ${selectedTags.includes(t) ? "active" : ""}`}
              onClick={() => toggleTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* 推荐模块：基于书架标签推荐 */}
      {shelfBooks.length > 0 && !hasFilter && (
        <section className="recommend-section">
          <div className="recommend-head">
            <h3 className="recommend-title">📖 猜你喜欢</h3>
            <span className="recommend-sub">基于你的书架标签推荐</span>
          </div>
          <div className="recommend-scroll">
            {shelfBooks.map((b) => (
              <Link
                key={b.id}
                to={`/book/${encodeURIComponent(b.id)}`}
                className="card recommend-chip"
              >
                <span className="recommend-chip-title">{b.title}</span>
                <span className="recommend-chip-author">{b.author || "未知作者"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="filter-section-modern card">
        <FilterBar
          allTags={allTags}
          selectedTags={selectedTags}
          toggleTag={toggleTag}
          wordMin={wordMin}
          setWordMin={setWordMin}
          wordMax={wordMax}
          setWordMax={setWordMax}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          sort={sort}
          setSort={setSort}
          onClear={clearFilters}
          hasFilter={hasFilter}
        />
      </section>

      <div className="discover-toolbar">
        <div className="sort-tabs">
          {QUICK_SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`sort-tab ${sort === s.value ? "active" : ""}`}
              onClick={() => setSort(s.value)}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            className="shuffle-btn"
            onClick={() => setShuffleSeed((s) => s + 1)}
            title="换一批"
          >
            换一批
          </button>
        </div>
        <div className="view-toggle">
          <button
            type="button"
            className={`view-btn ${view === "grid" ? "active" : ""}`}
            onClick={() => setView("grid")}
            title="网格"
          >
            ▦
          </button>
          <button
            type="button"
            className={`view-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
            title="列表"
          >
            ☰
          </button>
        </div>
      </div>

      <main>
        {loading && (
          <div className="empty-state" aria-live="polite">
            <p>正在加载书籍数据…</p>
          </div>
        )}
        {loading && (view === "grid" ? <BookCardSkeletonGrid count={6} /> : <BookCardSkeletonList count={4} />)}
        {error && (
          <div className="empty-state error" aria-live="assertive">
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && books.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p>没有找到相关书籍</p>
            <span className="empty-hint">试试调整筛选条件或清除筛选</span>
          </div>
        )}

        {!loading && !error && (
          <div className={view === "grid" ? "grid grid-3" : "book-list-view"}>
            {displayBooks.map((b) => (
              <BookCard key={b.id} book={b} view={view} />
            ))}
          </div>
        )}
      </main>

      <footer className="site-footer">
        <p>
          想管理书籍？访问 <Link to="/admin">管理台</Link>
          {" · "}
          <Link to="/shelf">我的书架</Link>
        </p>
      </footer>
    </div>
  );
}
