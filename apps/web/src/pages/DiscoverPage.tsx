import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookCard, EmptyState, Skeleton, useAsyncState, type Book } from '@novel/components';
import { Carousel } from '@/components/Carousel';
import { SectionTitle } from '@/components/SectionTitle';
import { Countdown } from '@/components/Countdown';
import { ErrorState } from '@/components/ErrorState';
import { DiscoverModule } from '@/components/DiscoverModule';
import { fetcher } from '@/api/fetcher';
import type { BookSummary, Category, DiscoverHome, RankType } from '@/api/types';
import './DiscoverPage.css';

const RANK_TABS: { key: RankType; label: string }[] = [
  { key: 'hot', label: '人气榜' },
  { key: 'follow', label: '收藏榜' },
  { key: 'ticket', label: '月票榜' },
  { key: 'new', label: '新书榜' },
];

function toBook(b: BookSummary): Book {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    cover: b.cover,
    tags: b.tags,
    intro: b.intro,
    rating: b.rating,
    status: b.status,
    updateTime: b.lastUpdated,
  };
}

/** 默认空聚合数据，避免首屏 null */
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
  const pageError = homeState.status === 'error';

  const [rankType, setRankType] = useState<RankType>('hot');

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
          {/* Banner */}
          <section className="discover-page__banner container-page">
            <DiscoverModule loading={pageLoading} skeletonRows={8}>
              {home.banners.length === 0 ? (
                <EmptyState title="暂无轮播内容" />
              ) : (
                <Carousel banners={home.banners} />
              )}
            </DiscoverModule>
          </section>

          {/* 本周热门 */}
          <section className="discover-page__section container-page">
            <SectionTitle title="本周热门" subtitle="HOT" moreTo="/category?sort=hot" />
            <DiscoverModule loading={pageLoading} skeletonRows={4}>
              {home.hotBooks.length === 0 ? (
                <EmptyState title="暂无热门推荐" />
              ) : (
                <div className="discover-page__horizontal scroll-x">
                  {home.hotBooks.filter(Boolean).map((b) => (
                    <BookCard key={b.id} book={toBook(b)} variant="horizontal" size="sm" onClick={() => navigate(`/book/${b.id}`)} />
                  ))}
                </div>
              )}
            </DiscoverModule>
          </section>

          {/* 限免专区 */}
          <section className="discover-page__section container-page">
            <SectionTitle title="限免专区" subtitle="FREE" moreTo="/category?tag=free-limited" />
            <DiscoverModule loading={pageLoading} skeletonRows={4}>
              {home.freeBooks.length === 0 ? (
                <EmptyState title="暂无限免书籍" />
              ) : (
                <div className="discover-page__free-grid">
                  {home.freeBooks.filter(Boolean).map((b) => (
                    <div key={b.id} className="discover-page__free-item">
                      <BookCard book={toBook(b)} variant="grid" size="sm" onClick={() => navigate(`/book/${b.id}`)} />
                      <div className="discover-page__free-meta">
                        {b.freeDeadline ? (
                          <Countdown deadline={b.freeDeadline} />
                        ) : (
                          <span className="discover-page__free-badge">限免中</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DiscoverModule>
          </section>

          {/* 分类入口 */}
          <section className="discover-page__section container-page">
            <SectionTitle title="分类入口" subtitle="CATEGORY" moreTo="/category" />
            {pageLoading ? (
              <Skeleton rows={4} />
            ) : home.categories.length === 0 ? null : (
              <CategoryGrid categories={home.categories} />
            )}
          </section>

          {/* 编辑推荐 + 排行榜 双栏 */}
          <section className="discover-page__dual container-page">
            <div className="discover-page__dual-main">
              <SectionTitle title="编辑推荐" subtitle="EDITOR PICK" />
              <DiscoverModule loading={pageLoading} skeletonRows={6}>
                {home.editorPicks.length === 0 ? (
                  <EmptyState title="暂无编辑推荐" />
                ) : (
                  <div className="discover-page__editor-list">
                    {home.editorPicks.map((b, i) => (
                      <Link
                        key={b.id}
                        to={`/book/${b.id}`}
                        className="discover-page__editor-item hover-rise"
                      >
                        <img
                          src={b.cover}
                          alt={b.title}
                          className="discover-page__editor-cover"
                          loading="lazy"
                        />
                        <div className="discover-page__editor-info">
                          <div className="discover-page__editor-rank">No.{i + 1}</div>
                          <h3 className="discover-page__editor-title">{b.title}</h3>
                          <p className="discover-page__editor-intro">{b.intro}</p>
                          <div className="discover-page__editor-meta">
                            <span>{b.author}</span>
                            <span className="discover-page__editor-cat">{b.category}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </DiscoverModule>
            </div>

            <aside className="discover-page__dual-aside">
              <SectionTitle title="排行榜" subtitle="RANKING" moreTo="/category?sort=hot" />
              <div className="discover-page__rank-tabs" role="tablist" aria-label="排行榜切换">
                {RANK_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={rankType === t.key}
                    className={`discover-page__rank-tab ${rankType === t.key ? 'is-active' : ''}`}
                    onClick={() => setRankType(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <DiscoverModule loading={pageLoading} skeletonRows={5}>
                {(home.rankings[rankType] ?? []).length === 0 ? (
                  <EmptyState title="暂无榜单数据" />
                ) : (
                  <ol className="discover-page__rank-list">
                    {(home.rankings[rankType] ?? []).slice(0, 8).map((b, i) => (
                      <li key={b?.id ?? i} className="discover-page__rank-item">
                        <span
                          className={`discover-page__rank-num ${i < 3 ? `is-top-${i + 1}` : ''}`}
                          aria-hidden
                        >
                          {i + 1}
                        </span>
                        <Link to={`/book/${b?.id}`} className="discover-page__rank-title">
                          {b?.title ?? ""}
                        </Link>
                        <span className="discover-page__rank-author">{b?.author ?? ""}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </DiscoverModule>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}

/** 分类网格（支持二级分类展开） */
function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="discover-page__category-grid">
      {categories.filter(Boolean).map((c) => (
        <div key={c.id} className="discover-page__category-item hover-rise">
          <Link
            to={`/category?cat=${encodeURIComponent(c.name)}`}
            className="discover-page__category-main"
          >
            <div className="discover-page__category-icon" aria-hidden>
              {c.name.slice(0, 1)}
            </div>
            <div className="discover-page__category-name">{c.name}</div>
            <div className="discover-page__category-count">{c.count} 本</div>
          </Link>
          {c.children && c.children.length > 0 ? (
            <div className="discover-page__category-sub">
              {c.children.slice(0, 3).map((sub) => (
                <Link
                  key={sub.id}
                  to={`/category?cat=${encodeURIComponent(sub.name)}`}
                  className="discover-page__category-sub-item"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
