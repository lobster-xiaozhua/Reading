/* ============================================================
 * BookCard · 03 §6.1
 * 书籍卡片：grid / list / horizontal 三变体
 * 封面 3:4，hover scale(1.02)+sh-2，active scale(0.98)，loading 骨架
 * ============================================================ */

import { memo, useState, type MouseEvent } from "react";
import { Tag } from "./Tag.js";
import { RatingStars } from "./RatingStars.js";

/** 书籍领域模型（C 端通用，P3+ 页面复用） */
export interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;
  tags?: string[];
  intro?: string;
  rating?: number;
  /** 书架内标记：是否已加入书架 */
  added?: boolean;
  /** 是否有更新（书架场景，触发右上角红点） */
  hasUpdate?: boolean;
  /** 内容状态（书架分组排序用） */
  status?: "ongoing" | "completed" | "paused" | "reviewing" | "offline";
  /** 上次阅读时间（毫秒时间戳）； sortBy=recent / list 视图「上次阅读」展示 */
  lastReadTime?: number;
  /** 阅读进度 0-1；list 视图展示进度条 */
  progress?: number;
  /** 未读章节数（书架追更红点 + NotificationBadge 文案） */
  unreadChapters?: number;
  /** 最近更新时间（毫秒时间戳）；sortBy=update 用 */
  updateTime?: number;
}

export type BookCardVariant = "grid" | "list" | "horizontal";
export type BookCardSize = "sm" | "md" | "lg";

export interface BookCardProps {
  book: Book;
  variant?: BookCardVariant;
  size?: BookCardSize;
  /** 是否显示评分，默认 true */
  showRating?: boolean;
  /** 是否显示简介；list 变体默认 true，其余默认 false */
  showIntro?: boolean;
  /** 额外标签覆盖 book.tags */
  tags?: string[];
  /** loading 态：渲染骨架屏 */
  loading?: boolean;
  onClick?: (book: Book, e: MouseEvent<HTMLElement>) => void;
  className?: string;
}

/** size → 封面宽度 px（03 §6.1 规格：sm 80 / md 120 / lg 160） */
const COVER_WIDTH: Record<BookCardSize, number> = {
  sm: 80,
  md: 120,
  lg: 160,
};

export const BookCard = memo(function BookCard({
  book,
  variant = "grid",
  size = "md",
  showRating = true,
  showIntro,
  tags,
  loading = false,
  onClick,
  className,
}: BookCardProps) {
  const [coverError, setCoverError] = useState(false);

  if (loading)
    return (
      <BookCardSkeleton variant={variant} size={size} className={className} />
    );

  const introVisible = showIntro ?? variant === "list";
  const finalTags = (tags ?? book.tags ?? []).slice(0, 3);
  const coverW = COVER_WIDTH[size];

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    onClick?.(book, e);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick(book, e as unknown as MouseEvent<HTMLElement>);
    }
  };

  const rootCls = [
    "novel-book-card",
    `novel-book-card--${variant}`,
    `novel-book-card--${size}`,
    onClick ? "is-clickable" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const coverNode = (
    <div
      className="novel-book-card__cover"
      style={{ width: variant === "grid" ? "100%" : `${coverW}px` }}
    >
      {book.cover && !coverError ? (
        <img
          src={book.cover}
          alt={book.title}
          loading="lazy"
          onError={() => setCoverError(true)}
        />
      ) : (
        <div className="novel-book-card__cover-fallback" aria-hidden>
          <span>{book.title.slice(0, 1)}</span>
        </div>
      )}
      {book.added ? (
        <span className="novel-book-card__added">已加入</span>
      ) : null}
      {book.hasUpdate ? (
        <span className="novel-book-card__update-dot" aria-label="有更新" />
      ) : null}
    </div>
  );

  const infoNode = (
    <div className="novel-book-card__info">
      <div className="novel-book-card__title" title={book.title}>
        {book.title}
      </div>
      {variant !== "horizontal" ? (
        <div className="novel-book-card__author" title={book.author}>
          {book.author}
        </div>
      ) : null}
      {showRating && book.rating != null ? (
        <RatingStars value={book.rating} readonly size="sm" showValue />
      ) : null}
      {introVisible && book.intro ? (
        <div className="novel-book-card__intro">{book.intro}</div>
      ) : null}
      {finalTags.length > 0 ? (
        <div className="novel-book-card__tags">
          {finalTags.map((t) => (
            <Tag key={t} color="default">
              {t}
            </Tag>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <article
      className={rootCls}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${book.title} ${book.author}`}
    >
      {coverNode}
      {infoNode}
    </article>
  );
});

/* ---------- 骨架屏 ---------- */

function BookCardSkeleton({
  variant,
  size,
  className,
}: {
  variant: BookCardVariant;
  size: BookCardSize;
  className?: string;
}) {
  const coverW = COVER_WIDTH[size];
  return (
    <div
      className={[
        "novel-book-card",
        `novel-book-card--${variant}`,
        `novel-book-card--${size}`,
        "is-skeleton",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label="加载中"
    >
      <div
        className="novel-book-card__cover novel-book-card__cover--skeleton"
        style={{ width: variant === "grid" ? "100%" : `${coverW}px` }}
      />
      <div className="novel-book-card__info">
        <div className="novel-book-card__skeleton-line novel-book-card__skeleton-line--title" />
        <div className="novel-book-card__skeleton-line novel-book-card__skeleton-line--author" />
        <div className="novel-book-card__skeleton-line novel-book-card__skeleton-line--short" />
      </div>
    </div>
  );
}
