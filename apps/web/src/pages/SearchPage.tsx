/* ============================================================
 * P5-5 · 搜索页
 * 输入防抖 300ms → 联想建议；提交/点击 → 搜索结果
 * 搜索历史（localStorage）+ 热门搜索 + 结果列表 + 空状态
 * URL 同步：?q=关键词
 * ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookCard,
  EmptyState,
  Skeleton,
  useAsyncState,
} from '@novel/components';
import { NovelBookOpen, SystemUser, ContentTag } from '@novel/icons';
import { fetcher } from '@/api/fetcher';
import { toBook } from '@/utils/convert';
import type { BookSummary, SearchSuggestion } from '@/api/types';
import { useSearchStore } from '@/stores/searchStore';
import './SearchPage.css';

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [input, setInput] = useState(initialQuery);
  const [committedQuery, setCommittedQuery] = useState(initialQuery);
  const [debouncedInput, setDebouncedInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestListRef = useRef<HTMLDivElement | null>(null);

  const history = useSearchStore((s) => s.history);
  const addHistory = useSearchStore((s) => s.addHistory);
  const removeHistory = useSearchStore((s) => s.removeHistory);
  const clearHistory = useSearchStore((s) => s.clearHistory);

  /* ---------- 热门搜索 ---------- */
  const hotState = useAsyncState<string[]>(
    () => fetcher.getHotSearches(),
    { initial: [] as string[], loadingDelay: 200 },
  );
  const hotSearches = hotState.data ?? [];

  /* ---------- 联想建议（防抖 300ms） ---------- */
  useEffect(() => {
    if (!input.trim() || input === committedQuery) {
      setDebouncedInput('');
      return;
    }
    const t = setTimeout(() => setDebouncedInput(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input, committedQuery]);

  const fetchSuggestions = useCallback(
    () => fetcher.searchSuggestions(debouncedInput),
    [debouncedInput],
  );
  const suggestState = useAsyncState<SearchSuggestion[]>(
    fetchSuggestions,
    { deps: [debouncedInput], initial: [] as SearchSuggestion[], loadingDelay: 150 },
  );
  const suggestions = suggestState.data ?? [];

  /* ---------- 搜索结果（累积分页） ---------- */
  const [results, setResults] = useState<BookSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [resultsError, setResultsError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const retryInitial = () => setRetryToken((t) => t + 1);
  const hasQuery = committedQuery.trim().length > 0;
  const hasMore = results.length < total;
  const isAllLoaded = hasQuery && !resultsLoading && !resultsError && results.length > 0 && !hasMore;

  /* 新关键词提交 → 重置并加载第一页 */
  useEffect(() => {
    if (!committedQuery.trim()) {
      setResults([]);
      setTotal(0);
      setPage(1);
      setResultsLoading(false);
      setResultsError(false);
      return;
    }
    let alive = true;
    setResultsLoading(true);
    setResultsError(false);
    fetcher
      .searchBooks(committedQuery, 1, PAGE_SIZE)
      .then((r) => {
        if (!alive) return;
        setResults(r.items);
        setTotal(r.total);
        setPage(1);
      })
      .catch(() => {
        if (alive) setResultsError(true);
      })
      .finally(() => {
        if (alive) setResultsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [committedQuery, retryToken]);

  /* 加载更多 → 追加下一页 */
  const handleLoadMore = useCallback(() => {
    if (loadMoreLoading || !hasMore) return;
    let alive = true;
    setLoadMoreLoading(true);
    setResultsError(false);
    fetcher
      .searchBooks(committedQuery, page + 1, PAGE_SIZE)
      .then((r) => {
        if (!alive) return;
        setResults((prev) => {
          const seen = new Set(prev.map((b) => b.id));
          const next = r.items.filter((b) => !seen.has(b.id));
          return [...prev, ...next];
        });
        setTotal(r.total);
        setPage((p) => p + 1);
      })
      .catch(() => {
        if (alive) setResultsError(true);
      })
      .finally(() => {
        if (alive) setLoadMoreLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [committedQuery, page, hasMore, loadMoreLoading]);

  /* ---------- 提交搜索 ---------- */
  const commitSearch = (keyword: string) => {
    const k = keyword.trim();
    if (!k) return;
    setInput(k);
    setCommittedQuery(k);
    setShowSuggestions(false);
    addHistory(k);
    const next = new URLSearchParams(searchParams);
    next.set('q', k);
    setSearchParams(next, { replace: false });
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitSearch(input);
  };

  const handleFocus = () => {
    if (input.trim() && suggestions.length > 0) setShowSuggestions(true);
  };

  const handleSelectSuggestion = (s: SearchSuggestion) => {
    commitSearch(s.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestPanel || suggestions.length === 0) {
      if (e.key === 'Escape') setShowSuggestions(false);
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[activeSuggestionIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
        break;
    }
  };

  const showSuggestPanel = showSuggestions && debouncedInput.length > 0;

  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, SearchSuggestion[]> = {};
    suggestions.forEach((s) => {
      const key = s.type === 'book' ? '书籍' : s.type === 'author' ? '作者' : '标签';
      (groups[key] ??= []).push(s);
    });
    return groups;
  }, [suggestions]);

  return (
    <div className="search-page container-page fade-in">
      {/* 搜索框 */}
      <form className="search-page__form" role="search" onSubmit={handleSubmit}>
        <div className="search-page__input-wrap">
          <svg className="search-page__icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            className="search-page__input"
            placeholder="搜索书名 / 作者 / 标签"
            aria-label="搜索"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
              setActiveSuggestionIndex(-1);
            }}
            onFocus={handleFocus}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {input ? (
            <button
              type="button"
              className="search-page__clear"
              aria-label="清空"
              onClick={() => {
                setInput('');
                setCommittedQuery('');
                setDebouncedInput('');
                inputRef.current?.focus();
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ) : null}
        </div>
        <button type="submit" className="search-page__submit">
          搜索
        </button>
      </form>

      {/* 联想建议浮层 */}
      {showSuggestPanel ? (
        <div className="search-page__suggest" role="listbox" aria-label="搜索建议" ref={suggestListRef}>
          {suggestState.loading ? (
            <div className="search-page__suggest-loading"><Skeleton rows={3} /></div>
          ) : suggestions.length === 0 ? (
            <div className="search-page__suggest-empty">无匹配建议</div>
          ) : (
            Object.entries(groupedSuggestions).map(([group, items]) => (
              <div key={group} className="search-page__suggest-group">
                <div className="search-page__suggest-label">{group}</div>
                {items.map((s, i) => {
                  const globalIdx = Object.values(groupedSuggestions).flat().indexOf(s);
                  return (
                    <button
                      key={`${s.type}-${s.text}-${i}`}
                      type="button"
                      className={`search-page__suggest-item ${globalIdx === activeSuggestionIndex ? 'is-active' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(s);
                      }}
                      onMouseEnter={() => setActiveSuggestionIndex(globalIdx)}
                    >
                      <span className="search-page__suggest-type">{s.type === 'book' ? <NovelBookOpen size="sm" aria-hidden="true" /> : s.type === 'author' ? <SystemUser size="sm" aria-hidden="true" /> : <ContentTag size="sm" aria-hidden="true" />}</span>
                      <span className="search-page__suggest-text">{highlight(s.text, debouncedInput)}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}

      {/* 主体内容 */}
      {!hasQuery ? (
        <div className="search-page__landing">
          {/* 搜索历史 */}
          {history.length > 0 ? (
            <section className="search-page__section">
              <div className="search-page__section-head">
                <h2 className="search-page__section-title">搜索历史</h2>
                <button type="button" className="search-page__clear-btn" onClick={clearHistory}>
                  清空
                </button>
              </div>
              <div className="search-page__tags-wrap">
                {history.map((h) => (
                  <span key={h} className="search-page__tag-item">
                    <button type="button" className="search-page__tag-btn" onClick={() => commitSearch(h)}>
                      {h}
                    </button>
                    <button
                      type="button"
                      className="search-page__tag-remove"
                      aria-label={`删除 ${h}`}
                      onClick={() => removeHistory(h)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* 热门搜索 */}
          <section className="search-page__section">
            <div className="search-page__section-head">
              <h2 className="search-page__section-title">热门搜索</h2>
            </div>
            <div className="search-page__hot-list">
              {hotState.loading && hotSearches.length === 0 ? (
                <Skeleton rows={2} />
              ) : (
                hotSearches.map((h, i) => (
                  <button
                    key={h}
                    type="button"
                    className={`search-page__hot-item ${i < 3 ? `is-top-${i + 1}` : ''}`}
                    onClick={() => commitSearch(h)}
                  >
                    <span className="search-page__hot-rank">{i + 1}</span>
                    <span className="search-page__hot-text">{h}</span>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="search-page__results">
          {/* 结果统计 */}
          <div className="search-page__result-meta">
            搜索「<strong>{committedQuery}</strong>」找到 <strong>{total}</strong> 条结果
          </div>

          {/* 结果列表 */}
          {resultsLoading && results.length === 0 ? (
            <div className="search-page__list">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} rows={2} avatar />
              ))}
            </div>
          ) : resultsError && results.length === 0 ? (
            <div className="search-page__error">
              <EmptyState
                title="搜索失败"
                description="网络开小差了，请稍后重试"
                action={
                  <button
                    type="button"
                    className="search-page__retry-btn"
                    onClick={retryInitial}
                  >
                    重试
                  </button>
                }
              />
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              title={`没有找到与「${committedQuery}」相关的书籍`}
              description="试试更换关键词或减少筛选条件"
              illustration={
                <svg viewBox="0 0 120 120" width="120" height="120" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                  <circle cx="50" cy="50" r="28" />
                  <path d="M72 72l16 16" />
                  <path d="M40 50h20M50 40v20" opacity="0.4" />
                </svg>
              }
            />
          ) : (
            <>
              <div className="search-page__list">
                {results.map((b) => (
                  <Link key={b.id} to={`/book/${b.id}`} className="search-page__result-item">
                    <BookCard book={toBook(b)} variant="list" size="md" showIntro />
                  </Link>
                ))}
              </div>

              {/* 加载更多 / 全部加载完 */}
              {hasMore ? (
                <div className="search-page__loadmore">
                  <button
                    type="button"
                    className="search-page__loadmore-btn"
                    onClick={handleLoadMore}
                    disabled={loadMoreLoading}
                  >
                    {loadMoreLoading ? '加载中…' : '加载更多'}
                  </button>
                  {resultsError ? (
                    <p className="search-page__loadmore-error">
                      加载失败，请重试
                      <button type="button" onClick={handleLoadMore}>
                        重试
                      </button>
                    </p>
                  ) : null}
                </div>
              ) : isAllLoaded ? (
                <div className="search-page__loadmore">
                  <span className="search-page__loadmore-done">已加载全部</span>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- 高亮匹配文本 ---------- */

function highlight(text: string, keyword: string): ReactNode {
  if (!keyword) return text;
  const idx = text.indexOf(keyword);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-page__highlight">{text.slice(idx, idx + keyword.length)}</mark>
      {text.slice(idx + keyword.length)}
    </>
  );
}
