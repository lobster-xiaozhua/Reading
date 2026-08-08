import { memo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookCard,
  EmptyState,
  Skeleton,
  useAsyncState,
} from "@novel/components";
import { Carousel } from "@/components/Carousel";
import { LazyImage } from "@/components/LazyImage";
import { SectionTitle } from "@/components/SectionTitle";
import { RingCountdown } from "@/components/RingCountdown";
import { ErrorState } from "@/components/ErrorState";
import { DiscoverModule } from "@/components/DiscoverModule";
import { fetcher } from "@/api/fetcher";
import type { Category, DiscoverHome, RankType } from "@/api/types";
import { toBook } from "@/utils/convert";
import {
  NovelFire,
  NovelHeartFilled,
  NovelEye,
  NovelCrown,
  NovelMedal,
  NovelReward,
  NovelBookClosed,
  ContentBook,
  NovelMoon,
  NovelReadingGlasses,
} from "@novel/icons";
import "./DiscoverPage.css";

const RANK_TABS: { key: RankType; label: string }[] = [
  { key: "hot", label: "人气榜" },
  { key: "follow", label: "收藏榜" },
  { key: "ticket", label: "月票榜" },
  { key: "new", label: "新书榜" },
];

const EMPTY_HOME: DiscoverHome = {
  banners: [],
  hotBooks: [],
  freeBooks: [],
  editorPicks: [],
  categories: [],
  rankings: { hot: [], follow: [], ticket: [], new: [] },
};

export default function DiscoverPage() {
  const navigate = useNavigate();
  const fetchHome = useCallback(() => fetcher.getDiscoverHome(), []);
  const homeState = useAsyncState<DiscoverHome>(fetchHome, {
    initial: EMPTY_HOME,
    loadingDelay: 200,
  });

  const home = homeState.data ?? EMPTY_HOME;
  const pageLoading = homeState.loading && !homeState.loaded;
  const pageError = homeState.status === "error";

  const [rankType, setRankType] = useState<RankType>("hot");

  const handleBookClick = useCallback((id: string) => navigate(`/book/${id}`), [navigate]);
  const handleRankChange = useCallback((key: RankType) => setRankType(key), []);

  return (
    <div className="discover-page">
      {pageError ? (
        <ErrorState
          title="发现页加载失败"
          description="网络开小差了，请稍后重试"
          onRetry={() => homeState.run()}
        />
      ) : (
        <>
          <section className="discover-page__banner container-page">
            <DiscoverModule loading={pageLoading} skeletonRows={8}>
              {home.banners.length === 0 ? (
                <EmptyState title="暂无轮播内容" />
              ) : (
                <Carousel banners={home.banners} />
              )}
            </DiscoverModule>
          </section>

          <section className="discover-page__section container-page">
            <SectionTitle title="编辑精选" subtitle="EDITOR PICK" />
            <DiscoverModule loading={pageLoading} skeletonRows={4}>
              {home.editorPicks.length === 0 ? (
                <EmptyState title="暂无精选推荐" />
              ) : (
                <div className="discover-page__picks-grid">
{home.editorPicks
                      .filter(Boolean)
                      .slice(0, 6)
                      .map((b, idx) => (
                      <Link
                        key={b.id}
                        to={`/book/${b.id}`}
                        className={`discover-page__pick-card${idx === 0 ? " discover-page__pick-card--featured" : ""}`}
                      >
                        <div className="discover-page__pick-cover-wrap">
                          <LazyImage
                            src={b.cover}
                            alt={b.title}
                            className="discover-page__pick-cover"
                          />
                          <div className="discover-page__pick-overlay">
                            <span className="discover-page__pick-read">
                              立即阅读
                            </span>
                          </div>
                        </div>
                        <div className="discover-page__pick-info">
                          <h3 className="discover-page__pick-title">
                            {b.title}
                          </h3>
                          <p className="discover-page__pick-intro">{b.intro}</p>
                          <div className="discover-page__pick-meta">
                            <span className="discover-page__pick-author">
                              {b.author}
                            </span>
                            {b.rating ? (
                              <span className="discover-page__pick-rating">
                                <span
                                  className="discover-page__pick-star"
                                  aria-hidden
                                >
                                  {"\u2605"}
                                </span>
                                {b.rating}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </DiscoverModule>
          </section>

          <section className="discover-page__section container-page">
            <SectionTitle
              title="本周热门"
              subtitle="HOT"
              moreTo="/category?sort=hot"
            />
            <DiscoverModule loading={pageLoading} skeletonRows={3}>
              {home.hotBooks.length === 0 ? (
                <EmptyState title="暂无热门推荐" />
              ) : (
                <div className="discover-page__hot-scroll scroll-x">
                  {home.hotBooks.filter(Boolean).map((b) => (
                    <BookCard
                      key={b.id}
                      book={toBook(b)}
                      variant="horizontal"
                      size="sm"
                      onClick={() => handleBookClick(b.id)}
                    />
                  ))}
                </div>
              )}
            </DiscoverModule>
          </section>

<section className="discover-page__section container-page">
            <SectionTitle
              title="限免专区"
              subtitle="FREE"
              moreTo="/category?tag=free-limited"
            />
            <DiscoverModule loading={pageLoading} skeletonRows={3}>
              {home.freeBooks.length === 0 ? (
                <EmptyState title="暂无限免书籍" />
              ) : (
                <div className="discover-page__free-section">
                  <div className="discover-page__free-scroll">
                    {home.freeBooks.filter(Boolean).map((b) => (
                      <div key={b.id} className="discover-page__free-item">
                        <BookCard
                          book={toBook(b)}
                          variant="grid"
                          size="sm"
                          onClick={() => handleBookClick(b.id)}
                        />
                        <div className="discover-page__free-meta">
                          {b.freeDeadline ? (
                            <RingCountdown
                              start={b.freeDeadline - 7 * 86400000}
                              deadline={b.freeDeadline}
                              size={56}
                            />
                          ) : (
                            <span className="discover-page__free-badge">
                              限免中
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="discover-page__free-scroll-fade" aria-hidden />
                </div>
              )}
            </DiscoverModule>
          </section>

          <section className="discover-page__section container-page">
            <SectionTitle
              title="分类入口"
              subtitle="CATEGORY"
              moreTo="/category"
            />
            {pageLoading ? (
              <Skeleton rows={3} />
            ) : home.categories.length === 0 ? null : (
              <CategoryGrid categories={home.categories} />
            )}
          </section>

          <section className="discover-page__section container-page">
            <SectionTitle title="排行榜" subtitle="RANKING" />
            <DiscoverModule loading={pageLoading} skeletonRows={5}>
              <div className="discover-page__rank-header">
                <div
                  className="discover-page__rank-tabs"
                  role="tablist"
                  aria-label="排行榜切换"
                >
                  {RANK_TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={rankType === t.key}
                      className={`discover-page__rank-tab ${rankType === t.key ? "is-active" : ""}`}
                      onClick={() => handleRankChange(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <Link
                  to="/category?sort=hot"
                  className="discover-page__rank-more"
                >
                  完整榜单 ›
                </Link>
              </div>
              {(home.rankings[rankType] ?? []).length === 0 ? (
                <EmptyState title="暂无榜单数据" />
              ) : (
                <ol className="discover-page__rank-list">
                  {(home.rankings[rankType] ?? []).slice(0, 10).map((b, i) => (
                    <li key={b?.id ?? i} className="discover-page__rank-item">
                      <span
                        className={`discover-page__rank-num ${i < 3 ? `is-top-${i + 1}` : ""}`}
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <Link
                        to={`/book/${b?.id}`}
                        className="discover-page__rank-info"
                      >
                        <span className="discover-page__rank-title">
                          {b?.title ?? ""}
                        </span>
                        <span className="discover-page__rank-author">
                          {b?.author ?? ""}
                        </span>
                      </Link>
                      {b?.rating ? (
                        <span className="discover-page__rank-score">
                          {b.rating}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </DiscoverModule>
          </section>
        </>
      )}
    </div>
  );
}

const CATEGORY_ICON_MAP: Record<string, { icon: typeof NovelFire; color: string }> = {
  '玄幻': { icon: NovelFire, color: 'var(--color-brand-bg)' },
  '奇幻': { icon: NovelMoon, color: 'var(--color-brand-bg)' },
  '武侠': { icon: NovelCrown, color: 'var(--color-accent-orange-bg)' },
  '仙侠': { icon: NovelCrown, color: 'var(--color-accent-orange-bg)' },
  '言情': { icon: NovelHeartFilled, color: 'var(--color-rose-bg)' },
  '都市': { icon: ContentBook, color: 'var(--color-brand-bg)' },
  '历史': { icon: NovelMedal, color: 'var(--color-feedback-warning-bg)' },
  '游戏': { icon: NovelReward, color: 'var(--color-feedback-success-bg)' },
  '悬疑': { icon: NovelEye, color: 'var(--gray-3)' },
  '科幻': { icon: NovelReadingGlasses, color: 'var(--color-feedback-info-bg)' },
};

function getCategoryStyle(name: string): { icon: typeof NovelFire; color: string } {
  const match = CATEGORY_ICON_MAP[name];
  if (match) return match;
  return { icon: NovelBookClosed, color: 'var(--color-bg-subtle)' };
}

const CategoryGrid = memo(function CategoryGrid({
  categories,
}: {
  categories: Category[];
}) {
  return (
    <div className="discover-page__category-grid">
      {categories.filter(Boolean).map((c) => {
        const { icon: IconComponent, color } = getCategoryStyle(c.name);
        return (
          <Link
            key={c.id}
            to={`/category?cat=${encodeURIComponent(c.name)}`}
            className="discover-page__category-item stagger-enter"
            style={{ '--category-bg': color } as React.CSSProperties}
          >
            <span className="discover-page__category-icon" aria-hidden>
              <IconComponent size="xl" />
            </span>
            <span className="discover-page__category-name">{c.name}</span>
            <span className="discover-page__category-count">{c.count}本</span>
          </Link>
        );
      })}
    </div>
  );
});
