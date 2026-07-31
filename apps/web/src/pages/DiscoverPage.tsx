import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookCard, Skeleton, EmptyState, type Book } from '@novel/components';
import { Carousel } from '@/components/Carousel';
import { SectionTitle } from '@/components/SectionTitle';
import { Countdown } from '@/components/Countdown';
import { fetcher } from '@/api/fetcher';
import type { Banner, BookSummary, Category, RankType } from '@/api/types';
import { useAsyncState } from '@novel/components';
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

export default function DiscoverPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [hotBooks, setHotBooks] = useState<BookSummary[]>([]);
  const [freeBooks, setFreeBooks] = useState<BookSummary[]>([]);
  const [editorPicks, setEditorPicks] = useState<BookSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rankType, setRankType] = useState<RankType>('hot');
  const [loading, setLoading] = useState(true);

  const rankState = useAsyncState<BookSummary[]>(() => fetcher.getRanking(rankType), {
    deps: [rankType],
    initial: [],
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetcher.getBanners(),
      fetcher.getHotBooks(),
      fetcher.getFreeLimitedBooks(),
      fetcher.getEditorPicks(),
      fetcher.getCategories(),
    ]).then(([b, h, f, e, c]) => {
      if (!alive) return;
      setBanners(b);
      setHotBooks(h);
      setFreeBooks(f);
      setEditorPicks(e);
      setCategories(c);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 限免截止时间：今天 23:59
  const freeDeadline = (() => {
    const d = new Date();
    d.setHours(23, 59, 59, 0);
    return d.getTime();
  })();

  return (
    <div className="discover-page">
      {/* Banner */}
      <section className="discover-page__banner container-page">
        {loading ? <Skeleton rows={8} /> : <Carousel banners={banners} />}
      </section>

      {/* 本周热门 */}
      <section className="discover-page__section container-page">
        <SectionTitle title="本周热门" subtitle="HOT" moreTo="/category?sort=hot" />
        {loading ? (
          <Skeleton rows={4} />
        ) : hotBooks.length === 0 ? (
          <EmptyState title="暂无热门推荐" />
        ) : (
          <div className="discover-page__horizontal scroll-x">
            {hotBooks.map((b) => (
              <BookCard key={b.id} book={toBook(b)} variant="horizontal" size="sm" />
            ))}
          </div>
        )}
      </section>

      {/* 限免专区 */}
      <section className="discover-page__section container-page">
        <SectionTitle title="限免专区" subtitle="FREE" moreTo="/category?tag=free-limited" />
        {loading ? (
          <Skeleton rows={4} />
        ) : freeBooks.length === 0 ? (
          <EmptyState title="暂无限免书籍" />
        ) : (
          <div className="discover-page__free-grid">
            {freeBooks.map((b) => (
              <div key={b.id} className="discover-page__free-item">
                <BookCard book={toBook(b)} variant="grid" size="sm" />
                <div className="discover-page__free-meta">
                  <Countdown deadline={freeDeadline} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 分类入口 */}
      <section className="discover-page__section container-page">
        <SectionTitle title="分类入口" subtitle="CATEGORY" moreTo="/category" />
        <div className="discover-page__category-grid">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/category?cat=${encodeURIComponent(c.name)}`}
              className="discover-page__category-item hover-rise"
            >
              <div className="discover-page__category-icon" aria-hidden>
                {c.name.slice(0, 1)}
              </div>
              <div className="discover-page__category-name">{c.name}</div>
              <div className="discover-page__category-count">{c.count} 本</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 编辑推荐 + 排行榜 双栏 */}
      <section className="discover-page__dual container-page">
        <div className="discover-page__dual-main">
          <SectionTitle title="编辑推荐" subtitle="EDITOR PICK" />
          {loading ? (
            <Skeleton rows={6} />
          ) : (
            <div className="discover-page__editor-list">
              {editorPicks.map((b, i) => (
                <Link
                  key={b.id}
                  to={`/book/${b.id}`}
                  className="discover-page__editor-item hover-rise"
                >
                  <img src={b.cover} alt={b.title} className="discover-page__editor-cover" loading="lazy" />
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
          <ol className="discover-page__rank-list">
            {rankState.loading && (rankState.data?.length ?? 0) === 0 ? (
              <Skeleton rows={5} />
            ) : (
              (rankState.data ?? []).slice(0, 8).map((b, i) => (
                <li key={b.id} className="discover-page__rank-item">
                  <span
                    className={`discover-page__rank-num ${i < 3 ? `is-top-${i + 1}` : ''}`}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <Link to={`/book/${b.id}`} className="discover-page__rank-title">
                    {b.title}
                  </Link>
                  <span className="discover-page__rank-author">{b.author}</span>
                </li>
              ))
            )}
          </ol>
        </aside>
      </section>
    </div>
  );
}
