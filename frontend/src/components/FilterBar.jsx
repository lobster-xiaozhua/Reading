import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SORTS, TIME_RANGES } from "../constants.ts";

export default function FilterBar({
  allTags,
  selectedTags,
  toggleTag,
  wordMin,
  setWordMin,
  wordMax,
  setWordMax,
  timeRange,
  setTimeRange,
  sort,
  setSort,
  onClear,
  hasFilter,
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [tagSearch, setTagSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  // 筛选标签搜索过滤
  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return allTags;
    const q = tagSearch.trim().toLowerCase();
    return allTags.filter((t) => t.toLowerCase().includes(q));
  }, [allTags, tagSearch]);

  const activeFilterCount =
    selectedTags.length + (wordMin ? 1 : 0) + (wordMax ? 1 : 0) + (timeRange ? 1 : 0) + (sort !== "-updated_at" ? 1 : 0);

  // 当有筛选条件时，桌面端自动展开
  useEffect(() => {
    if (activeFilterCount > 0 && window.innerWidth >= 769) {
      setCollapsed(false);
    }
  }, [activeFilterCount]);

  return (
    <div className="filter-bar">
      <div className="filter-bar-head">
        <button className="filter-toggle" onClick={() => setCollapsed(!collapsed)}>
          <span>筛选</span>
          {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          <span className={`filter-caret ${collapsed ? "" : "open"}`}>▾</span>
        </button>
        {hasFilter && (
          <button className="clear-btn" onClick={onClear}>
            清除筛选
          </button>
        )}
      </div>

      <div className={`filter-body ${collapsed ? "collapsed" : "expanded"}`}>
        {allTags.length > 0 && (
          <div className="filter-section">
            <span className="filter-section-title">标签</span>
            {allTags.length > 8 && (
              <input
                className="input tag-search-input"
                type="text"
                placeholder="搜索标签…"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                aria-label="搜索标签"
              />
            )}
            <div className="tag-list">
              {filteredTags.length === 0 ? (
                <span className="empty-hint" style={{ fontSize: "12px" }}>无匹配标签</span>
              ) : (
                filteredTags.map((t) => (
                  <button
                    key={t}
                    className={`tag-chip ${selectedTags.includes(t) ? "active" : ""}`}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="filter-section">
          <span className="filter-section-title">字数</span>
          <div className="word-range">
            <input
              className="num-input"
              type="number"
              placeholder="最小"
              value={wordMin}
              onChange={(e) => setWordMin(e.target.value)}
              min="0"
            />
            <span className="tilde">~</span>
            <input
              className="num-input"
              type="number"
              placeholder="最大"
              value={wordMax}
              onChange={(e) => setWordMax(e.target.value)}
              min="0"
            />
          </div>
        </div>

        <div className="filter-section">
          <span className="filter-section-title">更新时间</span>
          <div className="tag-list">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                className={`tag-chip ${timeRange === r.value ? "active" : ""}`}
                onClick={() => setTimeRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <span className="filter-section-title">排序</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}