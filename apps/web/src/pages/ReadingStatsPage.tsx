/* ============================================================
 * P6 · 阅读统计页 ReadingStatsPage
 * 单列流式：统计概览 + 阅读热力图 + 阅读偏好分布 + 成就徽章墙
 * 依据：03 文档 §5.7
 * ============================================================ */
import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Link } from "react-router-dom";
import { NovelChapterLock, NavigationBack, NovelReadingGlasses } from "@novel/icons";
import {
  EmptyState,
  useAsyncState,
  type UseAsyncStateReturn,
} from "@novel/components";
import { fetcher } from "@/api/fetcher";
import type {
  Badge,
  HeatmapCell,
  PreferenceItem,
  ReadingStatOverview,
} from "@/api/types";
import "./ReadingStatsPage.css";

const WEEKS = 53;
const DAYS = 7;

/** 稳定的空数组引用：避免 `?? []` 每次 render 产生新引用导致 useMemo 每帧重算 */
const EMPTY_CELLS: HeatmapCell[] = [];
const EMPTY_PREFERENCES: PreferenceItem[] = [];
const EMPTY_BADGES: Badge[] = [];

/* ---------- 数字滚动：0 → target，dur-deliberate 540ms ease-out ---------- */
function useCountUp(target: number, duration = 540): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/* ---------- 格式化 ---------- */
function formatDuration(min: number): string {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  if (rest === 0) return `${h}h`;
  return `${h}h ${rest}m`;
}

function formatWords(w: number): string {
  return `${Math.round(w / 10000)}万`;
}

/* ---------- 热力图色阶 ---------- */
function heatLevel(d: number): 0 | 1 | 2 | 3 {
  if (d <= 0) return 0;
  if (d <= 30) return 1;
  if (d <= 60) return 2;
  return 3;
}

/* ---------- 环形图扇区色（accent-orange 渐变色系，color-mix 调节透明度） ---------- */
const RING_COLORS = [
  "var(--color-accent-orange)",
  "color-mix(in srgb, var(--color-accent-orange) 80%, var(--color-bg-surface))",
  "color-mix(in srgb, var(--color-accent-orange) 62%, var(--color-bg-surface))",
  "color-mix(in srgb, var(--color-accent-orange) 46%, var(--color-bg-surface))",
  "color-mix(in srgb, var(--color-accent-orange) 32%, var(--color-bg-surface))",
];

/* ---------- 模块内错误 ---------- */
function ModuleError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="reading-stats-page__module-error" role="alert">
      <span className="reading-stats-page__module-error-text">加载失败</span>
      <button
        type="button"
        className="reading-stats-page__retry reading-stats-page__retry--sm"
        onClick={onRetry}
      >
        重试
      </button>
    </div>
  );
}

/* ---------- 1. 统计概览卡片 ---------- */
function StatCard({
  target,
  label,
  format,
  loading,
}: {
  target: number;
  label: string;
  format: (v: number) => string;
  loading: boolean;
}) {
  const value = useCountUp(target);
  if (loading) {
    return (
      <div
        className="reading-stats-page__stat-card is-skeleton"
        aria-hidden="true"
      />
    );
  }
  return (
    <div className="reading-stats-page__stat-card">
      <span className="reading-stats-page__stat-value num-tabular">{format(value)}</span>
      <span className="reading-stats-page__stat-label">{label}</span>
    </div>
  );
}

/* ---------- 2. 阅读热力图 ---------- */
function HeatmapSection({
  state,
}: {
  state: UseAsyncStateReturn<HeatmapCell[]>;
}) {
  const [tip, setTip] = useState<{
    date: string;
    duration: number;
    x: number;
    y: number;
  } | null>(null);

  const cells = state.data ?? EMPTY_CELLS;
  const loading = state.loading && !state.loaded;
  const error = state.status === "error";

  const weeks = useMemo(() => {
    const arr: HeatmapCell[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      arr.push(cells.slice(w * DAYS, w * DAYS + DAYS));
    }
    return arr;
  }, [cells]);

  const monthLabels = useMemo(() => {
    const labels: string[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      const first = weeks[w]?.[0];
      if (!first) {
        labels.push("");
        continue;
      }
      const m = Number(first.date.slice(5, 7));
      if (m !== lastMonth) {
        labels.push(`${m}月`);
        lastMonth = m;
      } else {
        labels.push("");
      }
    }
    return labels;
  }, [weeks]);

  const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

  const showTip = (el: HTMLElement, cell: HeatmapCell) => {
    const rect = el.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top;
    const vw = window.innerWidth;
    const tipW = 160;
    const tipH = 40;
    if (x + tipW / 2 > vw) x = vw - tipW / 2;
    if (x - tipW / 2 < 0) x = tipW / 2;
    if (y - tipH - 8 < 0) y = rect.bottom + tipH + 8;
    setTip({ date: cell.date, duration: cell.duration, x, y });
  };
  const handleEnter = (
    e: ReactMouseEvent<HTMLDivElement>,
    cell: HeatmapCell,
  ) => {
    showTip(e.currentTarget, cell);
  };
  const handleLeave = () => setTip(null);
  /* 触摸设备：点击切换 tooltip（桌面 hover 已展示，点按可锁定/关闭） */
  const handleCellClick = (el: HTMLElement, cell: HeatmapCell) => {
    if (tip && tip.date === cell.date) {
      setTip(null);
    } else {
      showTip(el, cell);
    }
  };

  return (
    <section className="reading-stats-page__section" aria-label="阅读热力图">
      <h2 className="reading-stats-page__section-title">阅读热力图</h2>
      {error ? (
        <ModuleError onRetry={state.run} />
      ) : loading ? (
        <div
          className="reading-stats-page__heatmap-skeleton"
          aria-hidden="true"
        />
      ) : (
        <div className="reading-stats-page__heatmap-scroll">
          <div
            className="reading-stats-page__heatmap"
            role="grid"
            aria-label="阅读热力图，每格表示一天的阅读时长"
          >
            <div className="reading-stats-page__heat-months" aria-hidden="true">
              {monthLabels.map((label, i) => (
                <span key={i} className="reading-stats-page__heat-month">
                  {label}
                </span>
              ))}
            </div>
            <div className="reading-stats-page__heat-body">
              <div
                className="reading-stats-page__heat-day-labels"
                aria-hidden="true"
              >
                {DAY_LABELS.map((d) => (
                  <span key={d} className="reading-stats-page__heat-day-label">
                    {d}
                  </span>
                ))}
              </div>
              <div className="reading-stats-page__heat-weeks">
                {weeks.map((week, wi) => (
                  <div
                    key={wi}
                    className="reading-stats-page__heat-week"
                    role="row"
                  >
                    {week.map((cell) => {
                      const lv = heatLevel(cell.duration);
                      return (
                        <div
                          key={cell.date}
                          className={`reading-stats-page__heat-cell reading-stats-page__heat-cell--l${lv}`}
                          role="gridcell"
                          aria-label={`${cell.date} · 阅读 ${cell.duration} 分钟`}
                          onMouseEnter={(e) => handleEnter(e, cell)}
                          onMouseLeave={handleLeave}
                          onClick={(e) => handleCellClick(e.currentTarget, cell)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleCellClick(e.currentTarget, cell);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="reading-stats-page__heat-legend" aria-hidden="true">
              <span className="reading-stats-page__heat-legend-text">少</span>
              <span className="reading-stats-page__heat-cell reading-stats-page__heat-cell--l0" />
              <span className="reading-stats-page__heat-cell reading-stats-page__heat-cell--l1" />
              <span className="reading-stats-page__heat-cell reading-stats-page__heat-cell--l2" />
              <span className="reading-stats-page__heat-cell reading-stats-page__heat-cell--l3" />
              <span className="reading-stats-page__heat-legend-text">多</span>
            </div>
          </div>
        </div>
      )}
      {tip ? (
        <div
          className="reading-stats-page__heat-tip"
          style={{ left: tip.x, top: tip.y }}
          role="tooltip"
        >
          {tip.date} · 阅读 {tip.duration} 分钟
        </div>
      ) : null}
    </section>
  );
}

/* ---------- 3. 阅读偏好分布 ---------- */
function PreferenceSection({
  state,
}: {
  state: UseAsyncStateReturn<PreferenceItem[]>;
}) {
  const preferences = state.data ?? EMPTY_PREFERENCES;
  const loading = state.loading && !state.loaded;
  const error = state.status === "error";
  const [active, setActive] = useState<number | null>(null);

  const size = 120;
  const r = 42;
  const stroke = 14;
  const C = 2 * Math.PI * r;
  const totalWords = preferences.reduce((s, p) => s + p.words, 0);

  let acc = 0;
  const segments = preferences.map((p, i) => {
    const len = (p.percent / 100) * C;
    const seg = {
      category: p.category,
      percent: p.percent,
      words: p.words,
      len,
      offset: acc,
      color: RING_COLORS[i % RING_COLORS.length],
    };
    acc += len;
    return seg;
  });

  return (
    <section className="reading-stats-page__section" aria-label="阅读偏好分布">
      <h2 className="reading-stats-page__section-title">阅读偏好分布</h2>
      {error ? (
        <ModuleError onRetry={state.run} />
      ) : loading ? (
        <div
          className="reading-stats-page__pref is-skeleton"
          aria-hidden="true"
        >
          <div className="reading-stats-page__pref-ring-skeleton" />
          <div className="reading-stats-page__pref-legend-skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="reading-stats-page__pref-row-skeleton" />
            ))}
          </div>
        </div>
      ) : preferences.length === 0 ? (
        <p className="reading-stats-page__muted">暂无偏好数据</p>
      ) : (
        <div className="reading-stats-page__pref">
          <div className="reading-stats-page__pref-ring">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              width={size}
              height={size}
              role="img"
              aria-label="阅读偏好环形图"
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                style={{ stroke: "var(--color-bg-subtle)" }}
                strokeWidth={stroke}
              />
              <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                {segments.map((s, i) => (
                  <circle
                    key={s.category}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    style={{
                      stroke: s.color,
                      transition:
                        "stroke-width var(--dur-instant) var(--ease-standard)",
                    }}
                    strokeWidth={active === i ? stroke + 4 : stroke}
                    strokeDasharray={`${s.len} ${C - s.len}`}
                    strokeDashoffset={-s.offset}
                    className={
                      active !== null && active !== i ? "is-dim" : undefined
                    }
                  />
                ))}
              </g>
            </svg>
            <div className="reading-stats-page__pref-center">
              <span className="reading-stats-page__pref-total">
                {formatWords(totalWords)}
              </span>
              <span className="reading-stats-page__pref-total-label">
                累计字数
              </span>
            </div>
          </div>
          <ul className="reading-stats-page__pref-legend">
            {preferences.map((p, i) => (
              <li key={p.category}>
                <button
                  type="button"
                  className={`reading-stats-page__pref-row ${active === i ? "is-active" : ""}`}
                  onClick={() => setActive(active === i ? null : i)}
                  aria-pressed={active === i}
                  aria-label={`${p.category} 占比 ${p.percent}%，${formatWords(p.words)}`}
                >
                  <span
                    className="reading-stats-page__pref-dot"
                    style={{ background: RING_COLORS[i % RING_COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className="reading-stats-page__pref-name">
                    {p.category}
                  </span>
                  <span className="reading-stats-page__pref-percent">
                    {p.percent}%
                  </span>
                  <span
                    className="reading-stats-page__pref-bar"
                    aria-hidden="true"
                  >
                    <span
                      className="reading-stats-page__pref-bar-fill"
                      style={{ width: `${p.percent}%` }}
                    />
                  </span>
                  <span className="reading-stats-page__pref-words">
                    {formatWords(p.words)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ---------- 4. 成就徽章墙 ---------- */
function BadgeSection({ state }: { state: UseAsyncStateReturn<Badge[]> }) {
  const badges = state.data ?? EMPTY_BADGES;
  const loading = state.loading && !state.loaded;
  const error = state.status === "error";
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeBadge = activeId
    ? (badges.find((b) => b.id === activeId) ?? null)
    : null;

  return (
    <section className="reading-stats-page__section" aria-label="成就徽章">
      <h2 className="reading-stats-page__section-title">成就徽章</h2>
      {error ? (
        <ModuleError onRetry={state.run} />
      ) : loading ? (
        <div
          className="reading-stats-page__badge-grid is-skeleton"
          aria-hidden="true"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="reading-stats-page__badge-card is-skeleton"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="reading-stats-page__badge-grid">
            {badges.map((b) => {
              const isActive = activeId === b.id;
              return (
                <button
                  type="button"
                  key={b.id}
                  className={`reading-stats-page__badge-card ${b.unlocked ? "is-unlocked" : "is-locked"} ${isActive ? "is-active" : ""}`}
                  onClick={() => setActiveId(isActive ? null : b.id)}
                  aria-pressed={isActive}
                  aria-label={`${b.name}：${b.desc}${b.unlocked ? "（已解锁）" : "（未解锁）"}`}
                >
                  <span
                    className="reading-stats-page__badge-icon"
                    aria-hidden="true"
                  >
                    {b.unlocked ? (
                      b.icon
                    ) : (
                      <NovelChapterLock size="sm" aria-hidden="true" />
                    )}
                  </span>
                  <span className="reading-stats-page__badge-name">
                    {b.name}
                  </span>
                </button>
              );
            })}
          </div>
          {activeBadge ? (
            <div className="reading-stats-page__badge-tip" role="status">
              <p className="reading-stats-page__badge-tip-text">
                <strong>{activeBadge.name}</strong>
                <span className="reading-stats-page__badge-tip-desc">
                  {" "}
                  · {activeBadge.desc}
                </span>
                <span
                  className={`reading-stats-page__badge-status ${activeBadge.unlocked ? "is-unlocked" : "is-locked"}`}
                >
                  {activeBadge.unlocked ? "已解锁" : "未解锁"}
                </span>
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/* ---------- 页面 ---------- */
export default function ReadingStatsPage() {
  /* ---------- 数据：4 组 ---------- */
  const overviewState = useAsyncState<ReadingStatOverview>(
    () => fetcher.getReadingStatOverview(),
    { loadingDelay: 200 },
  );
  const heatmapState = useAsyncState<HeatmapCell[]>(
    () => fetcher.getHeatmap(),
    { initial: [] as HeatmapCell[], loadingDelay: 200 },
  );
  const preferencesState = useAsyncState<PreferenceItem[]>(
    () => fetcher.getPreferences(),
    { initial: [] as PreferenceItem[], loadingDelay: 200 },
  );
  const badgesState = useAsyncState<Badge[]>(() => fetcher.getBadges(), {
    initial: [] as Badge[],
    loadingDelay: 200,
  });

  const overview = overviewState.data;
  const overviewLoading = overviewState.loading && !overviewState.loaded;
  const overviewError = overviewState.status === "error";
  const isEmpty =
    overviewState.loaded &&
    !!overview &&
    overview.totalWords === 0 &&
    overview.streakDays === 0 &&
    overview.weeklyDuration === 0;

  const handleRetry = () => {
    overviewState.run();
    heatmapState.run();
    preferencesState.run();
    badgesState.run();
  };

  return (
    <div className="reading-stats-page container-page fade-in">
      <header className="reading-stats-page__header">
        <Link
          to="/profile"
          className="reading-stats-page__back"
          aria-label="返回个人中心"
        >
          <NavigationBack size="sm" aria-hidden="true" />
          <span>返回</span>
        </Link>
        <h1 className="reading-stats-page__title">阅读统计</h1>
      </header>

      {overviewError ? (
        <div className="reading-stats-page__error" role="alert">
          <p className="reading-stats-page__error-text">
            数据加载失败，请稍后重试
          </p>
          <button
            type="button"
            className="reading-stats-page__retry"
            onClick={handleRetry}
          >
            重试
          </button>
        </div>
      ) : isEmpty ? (
        <EmptyState
          title="还没有阅读数据"
          description="去读一本书，开启你的阅读之旅"
          illustration={<NovelReadingGlasses size="xl" />}
          action={
            <Link to="/" className="reading-stats-page__cta">
              去发现好书
            </Link>
          }
        />
      ) : (
        <>
          {/* 1. 统计概览 */}
          <section
            className="reading-stats-page__section"
            aria-label="统计概览"
          >
            <h2 className="reading-stats-page__section-title">统计概览</h2>
            <div className="reading-stats-page__stat-grid">
              <StatCard
                target={overview?.weeklyDuration ?? 0}
                label="本周阅读时长"
                format={formatDuration}
                loading={overviewLoading}
              />
              <StatCard
                target={overview?.totalWords ?? 0}
                label="累计阅读字数"
                format={formatWords}
                loading={overviewLoading}
              />
              <StatCard
                target={overview?.streakDays ?? 0}
                label="连续阅读天数"
                format={(v) => `${Math.round(v)}天`}
                loading={overviewLoading}
              />
            </div>
          </section>

          {/* 2. 阅读热力图 */}
          <HeatmapSection state={heatmapState} />

          {/* 3. 阅读偏好分布 */}
          <PreferenceSection state={preferencesState} />

          {/* 4. 成就徽章墙 */}
          <BadgeSection state={badgesState} />
        </>
      )}
    </div>
  );
}
