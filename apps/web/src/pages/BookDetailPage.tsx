/* ============================================================
 * P5-2 · 书籍详情页
 * 面包屑 + 封面/BookMeta/操作按钮 + 评分分布 + 目录
 * + 相关推荐 + 评论区 + 打赏占位
 * ============================================================ */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BookMeta,
  BookCard,
  Button,
  ChapterList,
  EmptyState,
  Skeleton,
  Tabs,
  useAsyncState,
  useFeedback,
  type Book,
  type Chapter,
  type ChapterOrder,
} from '@novel/components';
import { fetcher } from '@/api/fetcher';
import type {
  BookSummary,
  ChapterSummary,
  Comment,
  RatingDistribution as RatingDist,
} from '@/api/types';
import { useUserStore } from '@/stores/userStore';
import { useHistoryStore } from '@/stores/historyStore';
import { RatingDistribution } from '@/components/RatingDistribution';
import './BookDetailPage.css';

type DetailTab = 'chapters' | 'comments' | 'reward';

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

function toChapter(c: ChapterSummary, readChapterIds: Set<string>): Chapter {
  return {
    id: c.id,
    title: c.title,
    wordCount: c.wordCount,
    isVip: c.isVip,
    updateTime: c.publishedAt,
    read: readChapterIds.has(c.id),
  };
}

export default function BookDetailPage() {
  const { bookId = '' } = useParams();
  const navigate = useNavigate();
  const feedback = useFeedback();
  const isInBookshelf = useUserStore((s) => s.isInBookshelf(bookId));
  const toggleBookshelf = useUserStore((s) => s.toggleBookshelf);
  const historyEntry = useHistoryStore((s) => s.entries[bookId]);
  const [order, setOrder] = useState<ChapterOrder>('asc');
  const [tab, setTab] = useState<DetailTab>('chapters');

  /* ---------- 数据加载 ---------- */
  const bookState = useAsyncState<BookSummary | null>(
    () => fetcher.getBook(bookId),
    { deps: [bookId], loadingDelay: 200 },
  );
  const chaptersState = useAsyncState<ChapterSummary[]>(
    () => fetcher.getChapters(bookId),
    { deps: [bookId], initial: [] as ChapterSummary[], loadingDelay: 200 },
  );
  const relatedState = useAsyncState<BookSummary[]>(
    () => fetcher.getRelatedBooks(bookId),
    { deps: [bookId], initial: [] as BookSummary[], loadingDelay: 200 },
  );
  const commentsState = useAsyncState<Comment[]>(
    () => fetcher.getComments(bookId),
    { deps: [bookId], initial: [] as Comment[], loadingDelay: 200 },
  );
  const ratingState = useAsyncState<RatingDist>(
    () => fetcher.getRatingDistribution(bookId),
    { deps: [bookId], loadingDelay: 200 },
  );

  const book = bookState.data ?? null;
  const chapters = chaptersState.data ?? [];
  const related = relatedState.data ?? [];
  const comments = commentsState.data ?? [];
  const rating = ratingState.data ?? null;

  /* ---------- 已读章节集合（来自历史） ---------- */
  const readChapterIds = useMemo(() => {
    const set = new Set<string>();
    if (historyEntry) set.add(historyEntry.chapterId);
    return set;
  }, [historyEntry]);

  const chapterItems = useMemo(
    () => chapters.map((c) => toChapter(c, readChapterIds)),
    [chapters, readChapterIds],
  );

  /* ---------- 操作 ---------- */
  const handleToggleShelf = () => {
    toggleBookshelf(bookId);
    feedback.message('success', isInBookshelf ? '已移出书架' : '已加入书架');
  };

  const handleStartReading = () => {
    const startChapter =
      historyEntry?.chapterId ?? chapters[0]?.id;
    if (!startChapter) return;
    navigate(`/read/${bookId}/${startChapter}`);
  };

  const handleSelectChapter = (ch: Chapter) => {
    navigate(`/read/${bookId}/${ch.id}`);
  };

  // 书籍不存在
  useEffect(() => {
    if (bookState.loaded && !bookState.data) {
      feedback.message('error', '书籍不存在或已下架');
    }
  }, [bookState.loaded, bookState.data, feedback]);

  /* ---------- 渲染 ---------- */
  if (bookState.loading && !book) {
    return (
      <div className="book-detail container-page">
        <Skeleton rows={6} />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="book-detail container-page">
        <EmptyState
          title="书籍不存在"
          description="该书籍可能已下架或链接错误"
          action={<Link to="/">返回首页</Link>}
        />
      </div>
    );
  }

  const enableVirtual = chapters.length > 500;

  return (
    <div className="book-detail">
      {/* 面包屑 */}
      <nav className="book-detail__breadcrumb container-page" aria-label="面包屑">
        <ol>
          <li><Link to="/">首页</Link></li>
          <li aria-hidden>/</li>
          <li><Link to={`/category?cat=${encodeURIComponent(book.category)}`}>{book.category}</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page">{book.title}</li>
        </ol>
      </nav>

      {/* 顶部：封面 + 元信息 + 操作 */}
      <section className="book-detail__hero container-page">
        <div className="book-detail__cover">
          <img src={book.cover} alt={book.title} />
          {book.flags.includes('vip') ? <span className="book-detail__flag book-detail__flag--vip">VIP</span> : null}
          {book.flags.includes('free-limited') ? <span className="book-detail__flag book-detail__flag--free">限免</span> : null}
        </div>
        <div className="book-detail__meta">
          <BookMeta
            title={book.title}
            author={book.author}
            wordCount={book.wordCount}
            chapterCount={chapters.length || undefined}
            status={book.status}
            updatedAt={book.lastUpdated}
            tags={book.tags}
            size="detailed"
          />
          <div className="book-detail__stats">
            <div className="book-detail__stat">
              <span className="book-detail__stat-value">{book.rating.toFixed(1)}</span>
              <span className="book-detail__stat-label">评分</span>
            </div>
            <div className="book-detail__stat">
              <span className="book-detail__stat-value">{(book.followCount / 10000).toFixed(1)}万</span>
              <span className="book-detail__stat-label">收藏</span>
            </div>
            <div className="book-detail__stat">
              <span className="book-detail__stat-value">{(book.clickCount / 10000).toFixed(0)}万</span>
              <span className="book-detail__stat-label">点击</span>
            </div>
          </div>
          <div className="book-detail__actions">
            <Button variant="primary" size="lg" onClick={handleStartReading} className="book-detail__read-btn">
              {historyEntry ? '继续阅读' : '开始阅读'}
            </Button>
            <Button
              variant={isInBookshelf ? 'secondary' : 'ghost'}
              size="lg"
              onClick={handleToggleShelf}
            >
              {isInBookshelf ? '已在书架' : '加入书架'}
            </Button>
          </div>
          {historyEntry ? (
            <div className="book-detail__last-read">
              上次读到：第{historyEntry.chapterIndex}章 {historyEntry.chapterTitle}（{historyEntry.percent}%）
            </div>
          ) : null}
        </div>
      </section>

      {/* 简介 */}
      <section className="book-detail__intro container-page">
        <h2 className="book-detail__section-title">内容简介</h2>
        <p className="book-detail__intro-text">{book.intro}</p>
      </section>

      {/* 评分分布 */}
      <section className="book-detail__rating container-page">
        <h2 className="book-detail__section-title">评分分布</h2>
        {rating ? <RatingDistribution data={rating} /> : <Skeleton rows={3} />}
      </section>

      {/* 目录 / 评论 / 打赏 Tab */}
      <section className="book-detail__tabs container-page">
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as DetailTab)}
          items={[
            {
              key: 'chapters',
              label: `目录(${chapters.length})`,
              children: (
                <div className="book-detail__chapters">
                  {chaptersState.loading && chapters.length === 0 ? (
                    <Skeleton rows={6} />
                  ) : chapters.length === 0 ? (
                    <EmptyState title="暂无章节" />
                  ) : (
                    <ChapterList
                      chapters={chapterItems}
                      order={order}
                      onOrderChange={setOrder}
                      onSelect={handleSelectChapter}
                      virtual={enableVirtual}
                      viewportHeight={560}
                      activeId={historyEntry?.chapterId}
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'comments',
              label: `评论(${comments.length})`,
              children: (
                <CommentList comments={comments} loading={commentsState.loading && comments.length === 0} />
              ),
            },
            {
              key: 'reward',
              label: '打赏',
              children: <RewardPlaceholder />,
            },
          ]}
        />
      </section>

      {/* 相关推荐 */}
      <section className="book-detail__related container-page">
        <h2 className="book-detail__section-title">相关推荐</h2>
        {relatedState.loading && related.length === 0 ? (
          <Skeleton rows={4} />
        ) : related.length === 0 ? (
          <EmptyState title="暂无相关推荐" />
        ) : (
          <div className="book-detail__related-grid">
            {related.map((b) => (
              <BookCard key={b.id} book={toBook(b)} variant="grid" size="sm" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- 评论列表 ---------- */

function CommentList({ comments, loading }: { comments: Comment[]; loading: boolean }) {
  if (loading) return <Skeleton rows={5} />;
  if (comments.length === 0) return <EmptyState title="暂无评论，来抢沙发吧" />;

  return (
    <ul className="book-detail__comments">
      {comments.map((c) => (
        <li key={c.id} className="book-detail__comment">
          <div className="book-detail__comment-header">
            <img src={c.user.avatar} alt={c.user.nickname} className="book-detail__comment-avatar" />
            <div className="book-detail__comment-meta">
              <span className="book-detail__comment-name">{c.user.nickname}</span>
              <span className="book-detail__comment-time">{formatTime(c.createdAt)}</span>
            </div>
            <span className="book-detail__comment-rating" aria-label={`评分 ${c.rating} 星`}>
              {'★'.repeat(c.rating)}
              <span className="book-detail__comment-rating-empty">{'★'.repeat(5 - c.rating)}</span>
            </span>
          </div>
          <p className="book-detail__comment-content">{c.content}</p>
          <div className="book-detail__comment-footer">
            <button type="button" className="book-detail__comment-like">
              <span aria-hidden>♥</span> {c.likes}
            </button>
          </div>
          {c.replies && c.replies.length > 0 ? (
            <ul className="book-detail__replies">
              {c.replies.map((r) => (
                <li key={r.id} className="book-detail__reply">
                  <img src={r.user.avatar} alt={r.user.nickname} className="book-detail__comment-avatar book-detail__comment-avatar--sm" />
                  <div>
                    <span className="book-detail__comment-name">{r.user.nickname}</span>
                    <span className="book-detail__comment-name book-detail__comment-name--author">作者</span>
                    <p className="book-detail__comment-content">{r.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/* ---------- 打赏占位 ---------- */

function RewardPlaceholder() {
  return (
    <div className="book-detail__reward">
      <div className="book-detail__reward-illustration" aria-hidden>
        <svg viewBox="0 0 120 120" width="96" height="96" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="60" cy="60" r="40" />
          <path d="M60 36v36M48 48h18a8 8 0 0 1 0 16H48" />
        </svg>
      </div>
      <p className="book-detail__reward-text">打赏功能即将上线</p>
      <p className="book-detail__reward-hint">支持作者，激励创作</p>
      <div className="book-detail__reward-presets" role="group" aria-label="打赏金额">
        {['100 月票', '500 推荐票', '1 杯咖啡', '5 杯咖啡'].map((label) => (
          <button key={label} type="button" className="book-detail__reward-preset" disabled>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- 工具 ---------- */

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const day = Math.floor(diff / 86400000);
  if (day < 1) return '今天';
  if (day < 30) return `${day} 天前`;
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
