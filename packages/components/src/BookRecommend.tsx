/* ============================================================
 * BookRecommend · P6 §5
 * 智能推荐横滑卡：标题 + 换一批(旋转 360) + scroll-snap 横滑
 * 单卡 100px，封面 3:4，匹配度标签，评分；loading 骨架
 * ============================================================ */

import { useState } from "react";
import { type Book } from "./BookCard.js";
import { NovelMedal } from "@novel/icons";

export interface RecommendBookItem {
  book: Book;
  /** 匹配度 0-100 */
  matchScore: number;
}

export interface BookRecommendProps {
  title?: string;
  books: RecommendBookItem[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelect?: (book: Book) => void;
  className?: string;
}

export function BookRecommend({
  title = "为你推荐",
  books,
  loading = false,
  onRefresh,
  onSelect,
  className,
}: BookRecommendProps) {
  const [spinId, setSpinId] = useState(0);

  const rootCls = ["novel-recommend", className ?? ""]
    .filter(Boolean)
    .join(" ");

  const handleRefresh = () => {
    if (!onRefresh) return;
    setSpinId((n) => n + 1);
    onRefresh();
  };

  return (
    <section className={rootCls} aria-label={title}>
      <div className="novel-recommend__head">
        <h3 className="novel-recommend__title">{title}</h3>
        {onRefresh ? (
          <button
            type="button"
            className="novel-recommend__refresh"
            onClick={handleRefresh}
            aria-label="换一批推荐"
          >
            <svg
              key={spinId}
              className={`novel-recommend__refresh-icon ${spinId > 0 ? "is-spinning" : ""}`}
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
            </svg>
            <span>换一批</span>
          </button>
        ) : null}
      </div>

      <div className="novel-recommend__scroll" role="list">
        {loading ? (
          <RecommendSkeleton />
        ) : books.length === 0 ? null : (
          books.map((item) => (
            <RecommendCard key={item.book.id} item={item} onSelect={onSelect} />
          ))
        )}
      </div>
    </section>
  );
}

function RecommendCard({
  item,
  onSelect,
}: {
  item: RecommendBookItem;
  onSelect?: (book: Book) => void;
}) {
  const { book, matchScore } = item;
  const clickable = typeof onSelect === "function";
  const cls = ["novel-recommend__card", clickable ? "is-clickable" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      role="listitem"
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onSelect?.(book) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(book);
              }
            }
          : undefined
      }
      aria-label={`${book.title}，匹配度 ${matchScore}%`}
    >
      <div className="novel-recommend__cover">
        {book.cover ? (
          <img src={book.cover} alt={book.title} loading="lazy" />
        ) : (
          <div className="novel-recommend__cover-fallback" aria-hidden>
            <span>{book.title.slice(0, 1)}</span>
          </div>
        )}
        <span className="novel-recommend__match">{matchScore}% 匹配</span>
      </div>
      <div className="novel-recommend__name" title={book.title}>
        {book.title}
      </div>
      {book.rating != null ? (
        <div
          className="novel-recommend__rating"
          aria-label={`评分 ${book.rating}`}
        >
          <NovelMedal
            size="sm"
            aria-hidden="true"
            className="novel-recommend__star"
          />
          <span className="novel-recommend__rating-num">
            {book.rating.toFixed(1)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function RecommendSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="novel-recommend__card is-skeleton"
          role="status"
          aria-label="加载中"
        >
          <div className="novel-recommend__cover novel-recommend__cover--skeleton" />
          <div className="novel-recommend__skeleton-line novel-recommend__skeleton-line--name" />
          <div className="novel-recommend__skeleton-line novel-recommend__skeleton-line--rating" />
        </div>
      ))}
    </>
  );
}
