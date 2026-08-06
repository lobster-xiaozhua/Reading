/* ============================================================
 * ChapterList · 03 §6.2
 * 章节列表：虚拟滚动（>500 章）/ VIP 锁 / 当前章高亮 / 正倒序
 * 列表项固定 48px，虚拟滚动仅渲染可视区 + 上下各 5 条缓冲
 * ============================================================ */

import { memo, useCallback, useMemo, useRef, useState, type CSSProperties } from "react";

/** 章节领域模型 */
export interface Chapter {
  id: string;
  title: string;
  wordCount?: number;
  updateTime?: string | number | Date;
  /** 是否 VIP 章节 */
  isVip?: boolean;
  /** 是否已读 */
  read?: boolean;
}

export type ChapterOrder = "asc" | "desc";

export interface ChapterListProps {
  chapters: Chapter[];
  /** 正序 / 倒序，默认 asc */
  order?: ChapterOrder;
  /** 当前阅读章节 id（高亮） */
  activeId?: string;
  onSelect?: (chapter: Chapter) => void;
  /** 启用虚拟滚动（章节数 >500 时开启） */
  virtual?: boolean;
  /** 虚拟滚动视口高度（px），默认 600 */
  viewportHeight?: number;
  /** 是否显示 VIP 标记，默认 true */
  showVip?: boolean;
  /** 倒序切换回调；提供时渲染排序切换按钮 */
  onOrderChange?: (order: ChapterOrder) => void;
  /** 加载更多回调；提供且 hasMore 时显示「加载更多」 */
  onLoadMore?: () => void;
  /** 是否还有更多 */
  hasMore?: boolean;
  /** 加载更多进行中 */
  loading?: boolean;
  className?: string;
}

/** 列表项固定高度（03 §6.2 规格：48px） */
const ITEM_HEIGHT = 48;
/** 虚拟滚动上下缓冲条数 */
const BUFFER = 5;

/* ---------- 内联图标（与 Drawer/Select 一致风格） ---------- */

function SortIcon({ desc }: { desc: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d={desc ? "M7 4v16M7 4L4 7M7 4l3 3" : "M17 4v16M17 20l-3-3M17 20l3-3"}
      />
      <path d={desc ? "M17 20V4" : "M7 4v16"} opacity="0.4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="9" rx="1" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="novel-chapter-list__spinner"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export function ChapterList({
  chapters,
  order = "asc",
  activeId,
  onSelect,
  virtual = false,
  viewportHeight = 600,
  showVip = true,
  onOrderChange,
  onLoadMore,
  hasMore = false,
  loading = false,
  className,
}: ChapterListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // 排序后的章节（倒序仅在展示层翻转，不修改源数据）
  const ordered = useMemo(() => {
    if (order === "desc") return [...chapters].reverse();
    return chapters;
  }, [chapters, order]);

  const total = ordered.length;

  // 虚拟滚动可视范围计算
  const range = useMemo(() => {
    if (!virtual) return { start: 0, end: total };
    const viewH = viewportHeight;
    const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const visibleCount = Math.ceil(viewH / ITEM_HEIGHT) + BUFFER * 2;
    const endIdx = Math.min(total, startIdx + visibleCount);
    return { start: startIdx, end: endIdx };
  }, [virtual, total, scrollTop, viewportHeight]);

  const visible = ordered.slice(range.start, range.end);

  const handleSelect = useCallback((ch: Chapter) => {
    onSelect?.(ch);
  }, [onSelect]);

  const rootCls = ["novel-chapter-list", className ?? ""]
    .filter(Boolean)
    .join(" ");

  const viewportStyle: CSSProperties = virtual
    ? { height: `${viewportHeight}px`, overflowY: "auto" }
    : {};

  // 虚拟滚动总高占位
  const totalH = total * ITEM_HEIGHT;
  const offsetTop = range.start * ITEM_HEIGHT;

  return (
    <div className={rootCls}>
      {onOrderChange ? (
        <div className="novel-chapter-list__toolbar">
          <button
            type="button"
            className="novel-chapter-list__order-btn"
            onClick={() => onOrderChange(order === "asc" ? "desc" : "asc")}
            aria-label={order === "asc" ? "切换为倒序" : "切换为正序"}
          >
            <SortIcon desc={order === "desc"} />
            <span>{order === "asc" ? "正序" : "倒序"}</span>
          </button>
          <span className="novel-chapter-list__count">共 {total} 章</span>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="novel-chapter-list__viewport"
        style={viewportStyle}
        onScroll={
          virtual ? (e) => setScrollTop(e.currentTarget.scrollTop) : undefined
        }
        role="listbox"
        aria-label="章节目录"
      >
        {virtual ? (
          <div style={{ height: `${totalH}px`, position: "relative" }}>
            <div style={{ transform: `translateY(${offsetTop}px)` }}>
              {visible.map((ch, i) => (
                <ChapterItem
                  key={ch.id}
                  chapter={ch}
                  index={range.start + i}
                  active={ch.id === activeId}
                  showVip={showVip}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {visible.map((ch, i) => (
              <ChapterItem
                key={ch.id}
                chapter={ch}
                index={i}
                active={ch.id === activeId}
                showVip={showVip}
                onSelect={handleSelect}
              />
            ))}
            {onLoadMore && hasMore ? (
              <div className="novel-chapter-list__load-more">
                <button
                  type="button"
                  className="novel-chapter-list__load-more-btn"
                  onClick={onLoadMore}
                  disabled={loading}
                >
                  {loading ? <Spinner /> : null}
                  {loading ? "加载中…" : "加载更多"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- 单个章节项 ---------- */

const ChapterItem = memo(function ChapterItem({
  chapter,
  index,
  active,
  showVip,
  onSelect,
}: {
  chapter: Chapter;
  index: number;
  active: boolean;
  showVip: boolean;
  onSelect: (ch: Chapter) => void;
}) {
  const cls = [
    "novel-chapter-list__item",
    active ? "is-active" : "",
    chapter.read ? "is-read" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      role="option"
      aria-selected={active}
      style={{ height: `${ITEM_HEIGHT}px` }}
      onClick={() => onSelect(chapter)}
      title={chapter.title}
    >
      <span className="novel-chapter-list__index">{index + 1}</span>
      <span className="novel-chapter-list__title">{chapter.title}</span>
      {showVip && chapter.isVip ? (
        <span
          className="novel-chapter-list__vip"
          aria-label="VIP 章节，需要 VIP 会员"
        >
          <LockIcon />
          <span aria-hidden>VIP</span>
        </span>
      ) : null}
      {chapter.wordCount != null ? (
        <span className="novel-chapter-list__meta">
          {formatWordCount(chapter.wordCount)}
        </span>
      ) : null}
    </button>
  );
});

/** 字数简写：<1万 原值；≥1万 显示「X.X万」 */
function formatWordCount(n: number): string {
  if (n < 10000) return `${n}`;
  const wan = n / 10000;
  return `${wan.toFixed(wan >= 100 ? 0 : 1)}字`;
}
