import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGetStats } from "../api.ts";
import { useAuth } from "../auth.jsx";
import { getHistory, getShelf, getAllBookmarks, getLocalStats } from "../lib/localLibrary.js";
import "../styles/_stats.css";

export default function Stats() {
  const { user } = useAuth();
  const [cloudStats, setCloudStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // 云端统计
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const ac = new AbortController();
    apiGetStats(ac.signal)
      .then(setCloudStats)
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [user]);

  // 本地统计（无需登录）
  const localStats = getLocalStats();
  const history = getHistory();
  const shelf = getShelf();
  const allBookmarks = getAllBookmarks();

  // 云端数据（如果有）
  const s = cloudStats || { today_minutes: 0, week_minutes: 0, total_minutes: 0, total_chapters: 0, total_days: 0, streak: 0, week_data: [] };

  // 阅读时长格式化
  const formatMinutes = (m) => {
    if (!m || m < 1) return "0 分钟";
    if (m < 60) return `${m} 分钟`;
    const h = Math.floor(m / 60);
    const remain = m % 60;
    return remain > 0 ? `${h} 小时 ${remain} 分钟` : `${h} 小时`;
  };

  // 标签统计（从书架）
  const tagCounts = {};
  shelf.forEach((b) => {
    (b.tags || []).forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTagCount = topTags.length > 0 ? Math.max(...topTags.map(([, c]) => c)) : 1;

  if (!user) {
    return (
      <div className="container-narrow page-enter" style={{ paddingTop: "var(--spacing-xxl)" }}>
        <header className="page-header-modern">
          <h1 className="h1">阅读统计</h1>
          <p className="subtitle">无需登录，本地阅读数据概览</p>
        </header>

        {/* 本地统计概览 */}
        <div className="stats-grid">
          <div className="card stats-card stats-card-accent">
            <div className="stats-number">{localStats.total_books}</div>
            <div className="stats-label">在读本书</div>
          </div>
          <div className="card stats-card">
            <div className="stats-number">{localStats.total_chapters}</div>
            <div className="stats-label">阅读章节</div>
          </div>
          <div className="card stats-card">
            <div className="stats-number">{localStats.total_bookmarks}</div>
            <div className="stats-label">书签数</div>
          </div>
          <div className="card stats-card">
            <div className="stats-number">{localStats.total_shelf}</div>
            <div className="stats-label">书架收藏</div>
          </div>
        </div>

        {/* 历史阅读列表 */}
        {history.length > 0 && (
          <div className="card" style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>最近阅读</h3>
            <div className="stats-history-list">
              {history.slice(0, 10).map((h) => (
                <Link
                  key={`${h.bookId}-${h.chapterId}`}
                  to={`/book/${encodeURIComponent(h.bookId)}/read/${encodeURIComponent(h.chapterId)}`}
                  className="stats-history-item"
                >
                  <div className="stats-history-title">{h.bookTitle || h.bookId}</div>
                  <div className="stats-history-meta">
                    {h.title || h.chapterId} · {Math.round((h.progress || 0) * 100)}%
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 最爱标签 */}
        {topTags.length > 0 && (
          <div className="card" style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>最爱标签</h3>
            <div className="stats-tag-list">
              {topTags.map(([tag, count]) => (
                <div key={tag} className="stats-tag-row">
                  <span className="stats-tag-name">{tag}</span>
                  <div className="stats-tag-bar-bg">
                    <div className="stats-tag-bar-fill" style={{ width: `${(count / maxTagCount) * 100}%` }} />
                  </div>
                  <span className="stats-tag-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", margin: "24px 0 48px" }}>
          <Link to="/login" style={{ color: "var(--accent)", fontSize: "14px" }}>登录后可同步到云端 →</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-narrow" style={{ paddingTop: "80px", textAlign: "center", color: "var(--text-muted)" }}>
        <div className="empty-spinner" />
        <p style={{ marginTop: "12px" }}>加载中…</p>
      </div>
    );
  }

  return (
    <div className="container-narrow page-enter" style={{ paddingTop: "var(--spacing-xxl)", paddingBottom: "var(--spacing-xxl)" }}>
      <header className="page-header-modern">
        <h1 className="h1">阅读统计</h1>
        <p className="subtitle">已同步到云端 · 共 {formatMinutes(s.total_minutes)}</p>
      </header>

      {/* 核心指标卡片 */}
      <div className="stats-grid">
        <div className="card stats-card stats-card-accent">
          <div className="stats-number">{s.today_minutes}</div>
          <div className="stats-label">今日阅读（分钟）</div>
        </div>
        <div className="card stats-card">
          <div className="stats-number">{s.week_minutes}</div>
          <div className="stats-label">本周阅读（分钟）</div>
        </div>
        <div className="card stats-card">
          <div className="stats-number">{s.total_minutes}</div>
          <div className="stats-label">总时长（分钟）</div>
        </div>
        <div className="card stats-card">
          <div className="stats-number">{s.total_chapters}</div>
          <div className="stats-label">读完章节</div>
        </div>
        <div className="card stats-card">
          <div className="stats-number">{s.total_days}</div>
          <div className="stats-label">阅读天数</div>
        </div>
        <div className="card stats-card">
          <div className="stats-number" style={{ color: s.streak > 0 ? "var(--accent)" : "var(--text-muted)" }}>
            {s.streak}
          </div>
          <div className="stats-label">连续阅读 <span style={{ fontSize: "16px" }}>🔥</span></div>
        </div>
      </div>

      {/* 近 7 天阅读趋势图 */}
      {s.week_data.length > 0 && (
        <div className="card" style={{ marginTop: "24px", padding: "20px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>近 7 天阅读趋势</h3>
          <div className="stats-chart">
            {s.week_data.map((m, i) => {
              const max = Math.max(...s.week_data, 1);
              const h = Math.max(4, (m / max) * 120);
              return (
                <div key={i} className="stats-bar-wrap">
                  <div className="stats-bar" style={{ height: `${h}px` }} />
                  <span className="stats-bar-label">{m}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 本地数据补充 */}
      <div className="stats-grid" style={{ marginTop: "24px" }}>
        <div className="card stats-card">
          <div className="stats-number">{localStats.total_bookmarks}</div>
          <div className="stats-label">书签数</div>
        </div>
        <div className="card stats-card">
          <div className="stats-number">{localStats.total_shelf}</div>
          <div className="stats-label">书架收藏</div>
        </div>
      </div>

      {/* 最爱标签 */}
      {topTags.length > 0 && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>最爱标签</h3>
          <div className="stats-tag-list">
            {topTags.map(([tag, count]) => (
              <div key={tag} className="stats-tag-row">
                <span className="stats-tag-name">{tag}</span>
                <div className="stats-tag-bar-bg">
                  <div className="stats-tag-bar-fill" style={{ width: `${(count / maxTagCount) * 100}%` }} />
                </div>
                <span className="stats-tag-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <Link to="/" style={{ color: "var(--accent)", fontSize: "14px" }}>← 返回书架</Link>
      </div>
    </div>
  );
}