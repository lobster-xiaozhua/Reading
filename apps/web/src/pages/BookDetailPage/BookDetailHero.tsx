import { BookMeta, Button, StatCard, type Chapter } from "@novel/components";
import { NavigationChevronLeft } from "@novel/icons";
import { LazyImage } from "@/components/LazyImage";
import type { BookSummary } from "@/api/types";

interface BookDetailHeroProps {
  book: BookSummary;
  chapters: Chapter[];
  isInBookshelf: boolean;
  historyEntry?: {
    chapterId: string;
    chapterIndex: number;
    chapterTitle: string;
    percent: number;
  } | null;
  onToggleShelf: () => void;
  onStartReading: () => void;
}

export function BookDetailHero({
  book,
  chapters,
  isInBookshelf,
  historyEntry,
  onToggleShelf,
  onStartReading,
}: BookDetailHeroProps) {
  return (
    <section className="book-detail__hero container-page">
      {/* 封面背景氛围光 */}
      <div className="book-detail__hero-bg" aria-hidden>
        {book.cover ? (
          <LazyImage
            src={book.cover}
            alt=""
            className="book-detail__hero-blur"
            eager
          />
        ) : null}
      </div>
      <div className="book-detail__cover">
        <LazyImage src={book.cover} alt={book.title} eager />
        {book.flags.includes("vip") ? (
          <span className="book-detail__flag book-detail__flag--vip">VIP</span>
        ) : null}
        {book.flags.includes("free-limited") ? (
          <span className="book-detail__flag book-detail__flag--free">
            限免
          </span>
        ) : null}
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
          <StatCard
            value={book.rating.toFixed(1)}
            label="评分"
            className="book-detail__stat"
          />
          <StatCard
            value={`${(book.followCount / 10000).toFixed(1)}万`}
            label="收藏"
            className="book-detail__stat"
          />
          <StatCard
            value={`${(book.clickCount / 10000).toFixed(0)}万`}
            label="点击"
            className="book-detail__stat"
          />
        </div>
        <div className="book-detail__actions">
          <Button
            variant="primary"
            size="lg"
            onClick={onStartReading}
            className="book-detail__read-btn"
          >
            {historyEntry ? "继续阅读" : "开始阅读"}
          </Button>
          <Button
            variant={isInBookshelf ? "secondary" : "ghost"}
            size="lg"
            onClick={onToggleShelf}
          >
            {isInBookshelf ? "已在书架" : "加入书架"}
          </Button>
        </div>
        {historyEntry ? (
          <div className="book-detail__last-read">
            <div className="book-detail__last-read-info">
              <span className="book-detail__last-read-label">上次读到</span>
              <span className="book-detail__last-read-text">
                第{historyEntry.chapterIndex}章 {historyEntry.chapterTitle}
              </span>
            </div>
            <div className="book-detail__last-read-progress">
              <div className="book-detail__last-read-track">
                <div
                  className="book-detail__last-read-fill"
                  style={{ width: `${historyEntry.percent}%` }}
                />
              </div>
              <span className="book-detail__last-read-pct">
                {historyEntry.percent}%
              </span>
            </div>
            <button
              type="button"
              className="book-detail__last-read-btn"
              onClick={onStartReading}
            >
              <NavigationChevronLeft size="xs" />
              继续阅读
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
