/* ============================================================
 * RankingBoard · P6 §1
 * 排行榜：人气/收藏/月票/新书 4 Tab；TOP1-3 奖牌；排名变化箭头
 * 行高 56px；切 Tab dur-normal 淡入；loading 骨架
 * ============================================================ */

import { useState } from 'react';
import { type Book } from './BookCard.js';
import { NovelTrendingUp, NovelTrendingDown } from '@novel/icons';

export type RankBoardType = 'hot' | 'follow' | 'ticket' | 'new';

export interface RankItemType {
  book: Book;
  rank: number;
  prevRank: number;
}

export interface RankingBoardProps {
  items: RankItemType[];
  type?: RankBoardType;
  rankIcon?: boolean;
  maxCount?: number;
  onTabChange?: (type: RankBoardType) => void;
  onSelect?: (book: Book) => void;
  loading?: boolean;
  className?: string;
}

const TABS: { key: RankBoardType; label: string }[] = [
  { key: 'hot', label: '人气榜' },
  { key: 'follow', label: '收藏榜' },
  { key: 'ticket', label: '月票榜' },
  { key: 'new', label: '新书榜' },
];

const TAB_LABEL: Record<RankBoardType, string> = {
  hot: '人气榜',
  follow: '收藏榜',
  ticket: '月票榜',
  new: '新书榜',
};

/** 排名变化：上升/下降/新上榜/持平
 * P8-A6 色觉障碍友好：颜色之外提供「升/降」文字 + 方向箭头双重表达，
 * 避免仅靠绿/红区分升降 */
function RankTrend({ rank, prevRank }: { rank: number; prevRank: number }) {
  if (prevRank === 0) {
    return (
      <span className="novel-ranking__trend novel-ranking__trend--new" aria-label="新上榜">
        NEW
      </span>
    );
  }
  if (prevRank === rank) {
    return (
      <span className="novel-ranking__trend novel-ranking__trend--flat" aria-label="排名持平">
        <span aria-hidden>—</span>
        <span className="sr-only">持平</span>
      </span>
    );
  }
  if (rank < prevRank) {
    const delta = prevRank - rank;
    return (
      <span className="novel-ranking__trend novel-ranking__trend--up" aria-label={`上升 ${delta} 位`}>
        <NovelTrendingUp size="xs" aria-hidden="true" />
        <span className="novel-ranking__trend-label" aria-hidden>升</span>
        {delta}
      </span>
    );
  }
  const delta = rank - prevRank;
  return (
    <span className="novel-ranking__trend novel-ranking__trend--down" aria-label={`下降 ${delta} 位`}>
      <NovelTrendingDown size="xs" aria-hidden="true" />
      <span className="novel-ranking__trend-label" aria-hidden>降</span>
      {delta}
    </span>
  );
}

/** TOP1-3 奖牌（金/银/铜 24px 圆形） */
function Medal({ rank }: { rank: number }) {
  const tier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';
  return (
    <span className={`novel-ranking__medal novel-ranking__medal--${tier}`} aria-label={`第 ${rank} 名`}>
      {rank}
    </span>
  );
}

export function RankingBoard({
  items,
  type = 'hot',
  rankIcon = true,
  maxCount = 10,
  onTabChange,
  onSelect,
  loading = false,
  className,
}: RankingBoardProps) {
  const [active, setActive] = useState<RankBoardType>(type);

  const handleTab = (t: RankBoardType) => {
    if (t === active) return;
    setActive(t);
    onTabChange?.(t);
  };

  const rootCls = ['novel-ranking', className ?? ''].filter(Boolean).join(' ');
  const visible = items.slice(0, maxCount);

  return (
    <section className={rootCls} aria-label={`${TAB_LABEL[active]}排行榜`}>
      <div className="novel-ranking__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={`novel-ranking__tab ${active === t.key ? 'is-active' : ''}`}
            onClick={() => handleTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ol className="novel-ranking__list" key={active} aria-busy={loading || undefined}>
        {loading ? (
          <RankingSkeleton rows={maxCount} />
        ) : visible.length === 0 ? (
          <li className="novel-ranking__empty">暂无榜单数据</li>
        ) : (
          visible.map((item) => (
            <RankingRow
              key={item.book.id}
              item={item}
              rankIcon={rankIcon}
              onSelect={onSelect}
            />
          ))
        )}
      </ol>
    </section>
  );
}

function RankingRow({
  item,
  rankIcon,
  onSelect,
}: {
  item: RankItemType;
  rankIcon: boolean;
  onSelect?: (book: Book) => void;
}) {
  const { book, rank, prevRank } = item;
  const isTop3 = rank <= 3;
  const clickable = typeof onSelect === 'function';

  const cls = [
    'novel-ranking__row',
    isTop3 ? 'is-top' : '',
    clickable ? 'is-clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect?.(book);
    }
  };

  return (
    <li
      className={cls}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onSelect?.(book) : undefined}
      onKeyDown={handleKeyDown}
      aria-label={`第 ${rank} 名 ${book.title} ${book.author}`}
    >
      <div className="novel-ranking__rank">
        {rankIcon && isTop3 ? (
          <Medal rank={rank} />
        ) : (
          <span className="novel-ranking__num" aria-hidden>{rank}</span>
        )}
      </div>
      <div className="novel-ranking__main">
        <div className="novel-ranking__title" title={book.title}>{book.title}</div>
        <div className="novel-ranking__author">{book.author}</div>
      </div>
      <div className="novel-ranking__meta">
        {book.rating != null ? (
          <span className="novel-ranking__score">
            <span className="novel-ranking__star" aria-hidden>★</span>
            <span className="novel-ranking__score-num">{book.rating.toFixed(1)}</span>
          </span>
        ) : null}
        <RankTrend rank={rank} prevRank={prevRank} />
      </div>
    </li>
  );
}

function RankingSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="novel-ranking__row is-skeleton" aria-hidden>
          <div className="novel-ranking__skeleton-rank" />
          <div className="novel-ranking__skeleton-body">
            <div className="novel-ranking__skeleton-line novel-ranking__skeleton-line--title" />
            <div className="novel-ranking__skeleton-line novel-ranking__skeleton-line--sub" />
          </div>
          <div className="novel-ranking__skeleton-line novel-ranking__skeleton-line--score" />
        </li>
      ))}
    </>
  );
}
