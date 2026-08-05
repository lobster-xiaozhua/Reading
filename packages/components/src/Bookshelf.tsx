/* ============================================================
 * Bookshelf · 03 §6.5
 * 书架组件：grid/list 视图；分组排序；追更红点；空状态
 * 规格：
 *   - grid：响应式列数 xs2 / sm3 / md4 / lg5 / xl6
 *   - list：单列，含封面 + 书名 + 阅读进度 + 上次阅读时间
 *   - 分组标题 font-sans 14px text-secondary uppercase
 *   - 排序/视图切换控件置于右上角，icon-only
 *   - 书籍有更新时封面右上角 8px rose 红点（BookCard hasUpdate 已支持）
 * ============================================================ */

import { useMemo, useState, type ReactNode, type MouseEvent } from 'react';
import { BookCard, type Book } from './BookCard.js';
import { EmptyState } from './EmptyState.js';
import { NotificationBadge } from './NotificationBadge.js';
import { ContentCategory, NavigationMenu, ActionSort } from '@novel/icons';

export type BookshelfGroupBy = 'none' | 'status' | 'tag';
export type BookshelfSortBy = 'recent' | 'title' | 'update';
export type BookshelfViewMode = 'grid' | 'list';

export interface BookshelfTab {
  key: string;
  label: string;
}

export interface BookshelfProps {
  books: Book[];
  /** 分组方式，默认 none */
  groupBy?: BookshelfGroupBy;
  /** 排序方式，默认 recent */
  sortBy?: BookshelfSortBy;
  /** 视图模式，默认 grid */
  viewMode?: BookshelfViewMode;
  /** 顶部过滤 Tab：全部 / 连载 / 完结 / 最近阅读 */
  tabs?: BookshelfTab[];
  /** 当前激活 Tab key；未传时内部维护 */
  activeTab?: string;
  onTabChange?: (key: string) => void;
  onGroupByChange?: (groupBy: BookshelfGroupBy) => void;
  onSortByChange?: (sortBy: BookshelfSortBy) => void;
  onViewModeChange?: (viewMode: BookshelfViewMode) => void;
  /** 书架变更回调（移除书籍等） */
  onUpdate?: (books: Book[]) => void;
  /** 点击书籍卡片 */
  onBookClick?: (book: Book, e: MouseEvent<HTMLElement>) => void;
  /** loading 态：渲染骨架 grid */
  loading?: boolean;
  /** 空书架时的行动按钮（默认渲染「去发现好书」） */
  emptyAction?: ReactNode;
  className?: string;
}

/* ---------- 内置 Tab key 约定（03 §6.5 JSX 示例） ---------- */
type BuiltinTabKey = 'all' | 'ongoing' | 'finished' | 'recent';

function filterByTab(books: Book[], tabKey: string): Book[] {
  switch (tabKey as BuiltinTabKey) {
    case 'ongoing':
      return books.filter((b) => b.status === 'ongoing');
    case 'finished':
      return books.filter((b) => b.status === 'completed');
    case 'recent':
      return books.filter((b) => b.lastReadTime != null);
    case 'all':
    default:
      return books;
  }
}

function sortBooks(books: Book[], sortBy: BookshelfSortBy): Book[] {
  const arr = [...books];
  switch (sortBy) {
    case 'title':
      return arr.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
    case 'update':
      return arr.sort((a, b) => (b.updateTime ?? 0) - (a.updateTime ?? 0));
    case 'recent':
    default:
      return arr.sort((a, b) => (b.lastReadTime ?? 0) - (a.lastReadTime ?? 0));
  }
}

/** 分组：返回 [{ key, label, books }]，保持分组顺序稳定 */
interface ShelfGroup {
  key: string;
  label: string;
  books: Book[];
}

const STATUS_GROUP_LABEL: Record<string, string> = {
  ongoing: '连载中',
  completed: '已完结',
  paused: '暂停更新',
  reviewing: '审核中',
  offline: '已下架',
  __unknown: '其他',
};

function groupBooks(books: Book[], groupBy: BookshelfGroupBy): ShelfGroup[] {
  if (groupBy === 'none') {
    return [{ key: '__all', label: '', books }];
  }
  const map = new Map<string, ShelfGroup>();
  for (const b of books) {
    let groupKey: string;
    let label: string;
    if (groupBy === 'status') {
      groupKey = b.status ?? '__unknown';
      label = STATUS_GROUP_LABEL[groupKey] ?? STATUS_GROUP_LABEL.__unknown;
    } else {
      // tag：按第一个 tag 分组；无 tag 归「未分类」
      const t = b.tags?.[0];
      groupKey = t ?? '__untagged';
      label = t ?? '未分类';
    }
    if (!map.has(groupKey)) {
      map.set(groupKey, { key: groupKey, label, books: [] });
    }
    map.get(groupKey)!.books.push(b);
  }
  // status 分组按固定顺序输出；tag 按首次出现顺序
  if (groupBy === 'status') {
    const order = ['ongoing', 'completed', 'paused', 'reviewing', 'offline', '__unknown'];
    return order
      .filter((k) => map.has(k))
      .map((k) => map.get(k)!);
  }
  return Array.from(map.values());
}

/* ---------- 图标（icon-only 控件） ---------- */

function GroupIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="12" width="18" height="4" rx="1" opacity="0.55" />
      <rect x="3" y="20" width="18" height="0.5" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
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
      style={{
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform var(--dur-fast) var(--ease-standard)',
      }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/* ---------- 排序/分组下拉菜单 ---------- */

const SORT_OPTIONS: { value: BookshelfSortBy; label: string }[] = [
  { value: 'recent', label: '最近阅读' },
  { value: 'update', label: '最近更新' },
  { value: 'title', label: '书名' },
];

const GROUP_OPTIONS: { value: BookshelfGroupBy; label: string }[] = [
  { value: 'none', label: '不分组' },
  { value: 'status', label: '按状态' },
  { value: 'tag', label: '按标签' },
];

/* ============================================================
 * Bookshelf 主组件
 * ============================================================ */

export function Bookshelf({
  books,
  groupBy: groupByProp,
  sortBy: sortByProp,
  viewMode: viewModeProp,
  tabs,
  activeTab: activeTabProp,
  onTabChange,
  onGroupByChange,
  onSortByChange,
  onViewModeChange,
  onUpdate,
  onBookClick,
  loading = false,
  emptyAction,
  className,
}: BookshelfProps) {
  /* 受控/非受控：未传 prop 时使用内部状态 */
  const [internalGroupBy, setInternalGroupBy] = useState<BookshelfGroupBy>('none');
  const [internalSortBy, setInternalSortBy] = useState<BookshelfSortBy>('recent');
  const [internalViewMode, setInternalViewMode] = useState<BookshelfViewMode>('grid');
  const [internalActiveTab, setInternalActiveTab] = useState<string>(tabs?.[0]?.key ?? 'all');

  const groupBy = groupByProp ?? internalGroupBy;
  const sortBy = sortByProp ?? internalSortBy;
  const viewMode = viewModeProp ?? internalViewMode;
  const activeTab = activeTabProp ?? internalActiveTab;

  const setGroupBy = (v: BookshelfGroupBy) => {
    if (groupByProp == null) setInternalGroupBy(v);
    onGroupByChange?.(v);
  };
  const setSortBy = (v: BookshelfSortBy) => {
    if (sortByProp == null) setInternalSortBy(v);
    onSortByChange?.(v);
  };
  const setViewMode = (v: BookshelfViewMode) => {
    if (viewModeProp == null) setInternalViewMode(v);
    onViewModeChange?.(v);
  };
  const setActiveTab = (v: string) => {
    if (activeTabProp == null) setInternalActiveTab(v);
    onTabChange?.(v);
  };

  /* 分组折叠态：仅 groupBy !== 'none' 时生效 */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* 过滤 → 排序 → 分组 */
  const groups = useMemo(() => {
    const filtered = filterByTab(books, activeTab);
    const sorted = sortBooks(filtered, sortBy);
    return groupBooks(sorted, groupBy);
  }, [books, activeTab, sortBy, groupBy]);

  /* 有更新的书籍（顶部 NotificationBadge 聚合提示） */
  const updateCount = useMemo(
    () => books.filter((b) => b.hasUpdate).length,
    [books],
  );

  /* 最近一条更新通知（单条模式） */
  const latestUpdate = useMemo(() => {
    const updated = books.filter((b) => b.hasUpdate);
    if (updated.length === 0) return null;
    return updated.reduce((max, b) =>
      (b.updateTime ?? 0) > (max.updateTime ?? 0) ? b : max,
    );
  }, [books]);

  const rootCls = ['novel-bookshelf', `novel-bookshelf--${viewMode}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  /* ---------- loading 骨架 ---------- */
  if (loading) {
    return (
      <div className={rootCls}>
        <BookshelfToolbar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          groupBy={groupBy}
          sortBy={sortBy}
          viewMode={viewMode}
          onGroupByChange={setGroupBy}
          onSortByChange={setSortBy}
          onViewModeChange={setViewMode}
        />
        <div className="novel-bookshelf__grid" role="status" aria-label="加载中">
          {Array.from({ length: 12 }).map((_, i) => (
            <BookCard key={i} book={EMPTY_BOOK} variant="grid" size="md" loading />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- 空书架 ---------- */
  if (books.length === 0) {
    return (
      <div className={rootCls}>
        <BookshelfToolbar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          groupBy={groupBy}
          sortBy={sortBy}
          viewMode={viewMode}
          onGroupByChange={setGroupBy}
          onSortByChange={setSortBy}
          onViewModeChange={setViewMode}
        />
        <div className="novel-bookshelf__empty">
          <EmptyState
            title="书架空空如也"
            description="把你喜欢的书加入书架，随时接着读"
            action={emptyAction ?? <DefaultDiscoverAction />}
          />
        </div>
      </div>
    );
  }

  /* ---------- 正常渲染 ---------- */
  return (
    <div className={rootCls}>
      <BookshelfToolbar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        groupBy={groupBy}
        sortBy={sortBy}
        viewMode={viewMode}
        onGroupByChange={setGroupBy}
        onSortByChange={setSortBy}
        onViewModeChange={setViewMode}
      />

      {/* 追更聚合提示：≥3 本有更新时聚合；1-2 本显示单条 */}
      {updateCount > 0 ? (
        <div className="novel-bookshelf__notify">
          {updateCount >= 3 ? (
            <NotificationBadge aggregateCount={updateCount} onClick={() => setActiveTab('recent')} />
          ) : latestUpdate ? (
            <NotificationBadge
              novelTitle={latestUpdate.title}
              chapterCount={latestUpdate.unreadChapters ?? 0}
              updateTime={latestUpdate.updateTime}
              read={false}
              onClick={() => onBookClick?.(latestUpdate, {} as MouseEvent<HTMLElement>)}
            />
          ) : null}
        </div>
      ) : null}

      {/* 分组列表 */}
      <div className="novel-bookshelf__body">
        {groups.map((g) => {
          const isCollapsed = collapsed.has(g.key);
          return (
            <section key={g.key} className="novel-bookshelf__group">
              {groupBy !== 'none' ? (
                <button
                  type="button"
                  className="novel-bookshelf__group-header"
                  onClick={() => toggleGroup(g.key)}
                  aria-expanded={!isCollapsed}
                  aria-label={`${g.label} 分组，${isCollapsed ? '展开' : '折叠'}`}
                >
                  <ChevronIcon open={!isCollapsed} />
                  <span className="novel-bookshelf__group-title">{g.label}</span>
                  <span className="novel-bookshelf__group-count">{g.books.length}</span>
                </button>
              ) : null}
              {!isCollapsed ? (
                viewMode === 'grid' ? (
                  <div className="novel-bookshelf__grid">
                    {g.books.map((b) => (
                      <BookCard
                        key={b.id}
                        book={b}
                        variant="grid"
                        size="md"
                        showRating={false}
                        onClick={onBookClick}
                      />
                    ))}
                  </div>
                ) : (
                  <ul className="novel-bookshelf__list">
                    {g.books.map((b) => (
                      <li key={b.id} className="novel-bookshelf__list-item">
                        <BookCard
                          book={b}
                          variant="list"
                          size="sm"
                          showRating={false}
                          onClick={onBookClick}
                        />
                        <ShelfBookMeta book={b} onUpdate={onUpdate} books={books} />
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 书架内书籍元信息（list 视图：进度 + 上次阅读 + 移除） ---------- */

function ShelfBookMeta({
  book,
  books,
  onUpdate,
}: {
  book: Book;
  books: Book[];
  onUpdate?: (books: Book[]) => void;
}) {
  const hasProgress = book.progress != null && book.progress > 0;
  const hasLastRead = book.lastReadTime != null;

  const handleRemove = () => {
    if (!onUpdate) return;
    onUpdate(books.filter((b) => b.id !== book.id));
  };

  return (
    <div className="novel-bookshelf__meta">
      {hasProgress ? (
        <div className="novel-bookshelf__progress">
          <div className="novel-bookshelf__progress-bar">
            <div
              className="novel-bookshelf__progress-fill"
              style={{ width: `${Math.min(100, Math.round((book.progress ?? 0) * 100))}%` }}
            />
          </div>
          <span className="novel-bookshelf__progress-text">
            {Math.round((book.progress ?? 0) * 100)}%
          </span>
        </div>
      ) : null}
      {hasLastRead ? (
        <span className="novel-bookshelf__last-read">
          上次阅读 {formatRelativeShort(book.lastReadTime!)}
        </span>
      ) : null}
      {onUpdate ? (
        <button
          type="button"
          className="novel-bookshelf__remove"
          aria-label={`将《${book.title}》移出书架`}
          onClick={handleRemove}
        >
          移出
        </button>
      ) : null}
    </div>
  );
}

/* ---------- 工具栏（Tab + 排序/分组/视图切换） ---------- */

function BookshelfToolbar({
  tabs,
  activeTab,
  onTabChange,
  groupBy,
  sortBy,
  viewMode,
  onGroupByChange,
  onSortByChange,
  onViewModeChange,
}: {
  tabs?: BookshelfTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  groupBy: BookshelfGroupBy;
  sortBy: BookshelfSortBy;
  viewMode: BookshelfViewMode;
  onGroupByChange: (v: BookshelfGroupBy) => void;
  onSortByChange: (v: BookshelfSortBy) => void;
  onViewModeChange: (v: BookshelfViewMode) => void;
}) {
  return (
    <div className="novel-bookshelf__toolbar">
      {tabs && tabs.length > 0 ? (
        <div className="novel-bookshelf__tabs" role="tablist" aria-label="书架过滤">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={activeTab === t.key}
              className={[
                'novel-bookshelf__tab',
                activeTab === t.key ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onTabChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="novel-bookshelf__controls">
        {/* 排序下拉 */}
        <label className="novel-bookshelf__control">
          <span className="novel-bookshelf__control-icon" aria-hidden>
            <ActionSort size="lg" aria-hidden="true" />
          </span>
          <select
            className="novel-bookshelf__select"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as BookshelfSortBy)}
            aria-label="排序方式"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* 分组下拉 */}
        <label className="novel-bookshelf__control">
          <span className="novel-bookshelf__control-icon" aria-hidden>
            <GroupIcon />
          </span>
          <select
            className="novel-bookshelf__select"
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value as BookshelfGroupBy)}
            aria-label="分组方式"
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* 视图切换：icon-only */}
        <div className="novel-bookshelf__view-toggle" role="group" aria-label="视图切换">
          <button
            type="button"
            className={[
              'novel-bookshelf__view-btn',
              viewMode === 'grid' ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onViewModeChange('grid')}
            aria-label="网格视图"
            aria-pressed={viewMode === 'grid'}
          >
            <ContentCategory size="lg" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={[
              'novel-bookshelf__view-btn',
              viewMode === 'list' ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onViewModeChange('list')}
            aria-label="列表视图"
            aria-pressed={viewMode === 'list'}
          >
            <NavigationMenu size="lg" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DefaultDiscoverAction() {
  return (
    <a className="novel-bookshelf__discover-btn" href="/discover">
      去发现好书
    </a>
  );
}

/* ---------- 工具：相对时间（简版，与 NotificationBadge 对齐） ---------- */

function formatRelativeShort(input: number): string {
  const diff = Date.now() - input;
  if (Number.isNaN(diff)) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  const date = new Date(input);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* 骨架屏占位用的空 Book */
const EMPTY_BOOK: Book = { id: '', title: '', author: '' };
