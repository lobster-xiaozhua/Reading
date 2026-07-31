/* ============================================================
 * P5-6 · 个人中心
 * UserCard（头像/昵称/等级/VIP/统计）+ Tab 切换：
 *   书架 / 阅读历史 / 书单 / 打赏记录 / 设置
 * URL 同步：?tab=bookshelf|history|booklists|rewards|settings
 * ============================================================ */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Bookshelf,
  EmptyState,
  Skeleton,
  Tabs,
  useAsyncState,
  type Book,
} from '@novel/components';
import { fetcher } from '@/api/fetcher';
import type {
  BookList,
  BookSummary,
  BookshelfTab,
  ReadingHistoryItem,
  RewardRecord,
  UserProfile,
} from '@/api/types';
import { useUserStore } from '@/stores/userStore';
import { useHistoryStore } from '@/stores/historyStore';
import './ProfilePage.css';

type ProfileTab = 'bookshelf' | 'history' | 'booklists' | 'rewards' | 'settings';

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'bookshelf', label: '我的书架' },
  { key: 'history', label: '阅读历史' },
  { key: 'booklists', label: '我的书单' },
  { key: 'rewards', label: '打赏记录' },
  { key: 'settings', label: '设置' },
];

const SHELF_TABS: { key: BookshelfTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'ongoing', label: '连载中' },
  { key: 'completed', label: '已完结' },
  { key: 'recent', label: '最近阅读' },
];

function toBook(b: BookSummary, lastReadTime?: number, progress?: number): Book {
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
    lastReadTime,
    progress,
  };
}

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = (searchParams.get('tab') as ProfileTab) ?? 'bookshelf';

  const user = useUserStore((s) => s.user);
  const historyEntries = useHistoryStore((s) => s.entries);

  /* ---------- 用户数据 ---------- */
  const userState = useAsyncState<UserProfile>(
    () => fetcher.getCurrentUser(),
    { initial: user ?? undefined, loadingDelay: 200 },
  );
  const profile = userState.data ?? user;

  /* ---------- 书架 ---------- */
  const [shelfTab, setShelfTab] = useState<BookshelfTab>(
    () => (searchParams.get('shelf') as BookshelfTab) ?? 'all',
  );
  const shelfState = useAsyncState<BookSummary[]>(
    () => fetcher.getBookshelf(shelfTab),
    { deps: [shelfTab], initial: [] as BookSummary[], loadingDelay: 200 },
  );
  const shelfBooks = useMemo(() => {
    const list = shelfState.data ?? [];
    return list.map((b) => {
      const entry = historyEntries[b.id];
      return toBook(b, entry?.readAt, entry ? entry.percent / 100 : undefined);
    });
  }, [shelfState.data, historyEntries]);

  /* ---------- 阅读历史 ---------- */
  const historyState = useAsyncState<ReadingHistoryItem[]>(
    () => fetcher.getReadingHistory(),
    { initial: [] as ReadingHistoryItem[], loadingDelay: 200 },
  );
  const histories = historyState.data ?? [];

  /* ---------- 书单 ---------- */
  const bookListsState = useAsyncState<BookList[]>(
    () => fetcher.getBookLists(),
    { initial: [] as BookList[], loadingDelay: 200 },
  );
  const bookLists = bookListsState.data ?? [];

  /* ---------- 打赏记录 ---------- */
  const rewardsState = useAsyncState<RewardRecord[]>(
    () => fetcher.getRewardRecords(),
    { initial: [] as RewardRecord[], loadingDelay: 200 },
  );
  const rewards = rewardsState.data ?? [];

  /* ---------- 切换 Tab ---------- */
  const handleTabChange = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    setSearchParams(next, { replace: false });
  };

  const handleBookClick = (book: Book) => {
    navigate(`/book/${book.id}`);
  };

  return (
    <div className="profile-page container-page">
      {/* 用户卡片 */}
      <section className="profile-page__user-card">
        {userState.loading && !profile ? (
          <Skeleton rows={3} avatar />
        ) : profile ? (
          <div className="profile-page__user-info">
            <Avatar src={profile.avatar} alt={profile.nickname} size="lg" />
            <div className="profile-page__user-meta">
              <div className="profile-page__user-name-row">
                <h1 className="profile-page__nickname">{profile.nickname}</h1>
                {profile.isVip ? (
                  <span className="profile-page__vip-badge">
                    VIP{profile.vipExpireAt ? ` · ${formatExpire(profile.vipExpireAt)}` : ''}
                  </span>
                ) : null}
                <span className="profile-page__level">Lv.{profile.level}</span>
              </div>
              <div className="profile-page__user-stats">
                <div className="profile-page__stat">
                  <span className="profile-page__stat-value">{profile.stats.readingDays}</span>
                  <span className="profile-page__stat-label">连续阅读</span>
                </div>
                <div className="profile-page__stat">
                  <span className="profile-page__stat-value">{Math.floor(profile.stats.readingMinutes / 60)}</span>
                  <span className="profile-page__stat-label">阅读时长(h)</span>
                </div>
                <div className="profile-page__stat">
                  <span className="profile-page__stat-value">{(profile.stats.readWords / 10000).toFixed(0)}万</span>
                  <span className="profile-page__stat-label">阅读字数</span>
                </div>
                <div className="profile-page__stat">
                  <span className="profile-page__stat-value">{profile.stats.bookshelfCount}</span>
                  <span className="profile-page__stat-label">书架</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Tab 切换 */}
      <section className="profile-page__tabs">
        <Tabs
          activeKey={tab}
          onChange={handleTabChange}
          items={TABS.map((t) => ({
            key: t.key,
            label: t.label,
            children: <></>,
          }))}
        />
      </section>

      {/* 内容区 */}
      <section className="profile-page__content">
        {tab === 'bookshelf' ? (
          <BookshelfTabContent
            books={shelfBooks}
            loading={shelfState.loading && shelfBooks.length === 0}
            shelfTab={shelfTab}
            onShelfTabChange={setShelfTab}
            onBookClick={handleBookClick}
          />
        ) : null}

        {tab === 'history' ? (
          <HistoryTimeline
            histories={histories}
            loading={historyState.loading && histories.length === 0}
          />
        ) : null}

        {tab === 'booklists' ? (
          <BookListsGrid
            lists={bookLists}
            loading={bookListsState.loading && bookLists.length === 0}
          />
        ) : null}

        {tab === 'rewards' ? (
          <RewardRecords
            records={rewards}
            loading={rewardsState.loading && rewards.length === 0}
          />
        ) : null}

        {tab === 'settings' ? <SettingsEntry /> : null}
      </section>
    </div>
  );
}

/* ---------- 书架 Tab 内容 ---------- */

function BookshelfTabContent({
  books,
  loading,
  shelfTab,
  onShelfTabChange,
  onBookClick,
}: {
  books: Book[];
  loading: boolean;
  shelfTab: BookshelfTab;
  onShelfTabChange: (tab: BookshelfTab) => void;
  onBookClick: (book: Book) => void;
}) {
  return (
    <div className="profile-page__shelf">
      <Bookshelf
        books={books}
        loading={loading}
        tabs={SHELF_TABS}
        activeTab={shelfTab}
        onTabChange={(k) => onShelfTabChange(k as BookshelfTab)}
        onBookClick={onBookClick}
        emptyAction={<Link to="/">去发现好书</Link>}
      />
    </div>
  );
}

/* ---------- 阅读历史时间线 ---------- */

function HistoryTimeline({
  histories,
  loading,
}: {
  histories: ReadingHistoryItem[];
  loading: boolean;
}) {
  if (loading) return <Skeleton rows={6} />;
  if (histories.length === 0) {
    return <EmptyState title="暂无阅读历史" description="开始阅读后这里会显示记录" action={<Link to="/">去找本书</Link>} />;
  }
  // 按日期分组
  const groups = groupByDay(histories);

  return (
    <ol className="profile-page__timeline">
      {Object.entries(groups).map(([day, items]) => (
        <li key={day} className="profile-page__timeline-group">
          <div className="profile-page__timeline-date">{day}</div>
          <ul className="profile-page__timeline-items">
            {items.map((h) => (
              <li key={h.bookId} className="profile-page__timeline-item">
                <Link to={`/book/${h.bookId}`} className="profile-page__timeline-cover">
                  <img src={h.book.cover} alt={h.book.title} loading="lazy" />
                </Link>
                <div className="profile-page__timeline-info">
                  <Link to={`/book/${h.bookId}`} className="profile-page__timeline-title">
                    {h.book.title}
                  </Link>
                  <div className="profile-page__timeline-chapter">
                    读到：第{h.chapterIndex}章 {h.chapterTitle}
                  </div>
                  <div className="profile-page__timeline-progress">
                    <div className="profile-page__timeline-progress-track">
                      <div
                        className="profile-page__timeline-progress-fill"
                        style={{ width: `${h.percent}%` }}
                      />
                    </div>
                    <span>{h.percent}%</span>
                  </div>
                </div>
                <Link
                  to={`/read/${h.bookId}/${h.chapterId}`}
                  className="profile-page__timeline-resume"
                >
                  继续阅读
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/* ---------- 书单 ---------- */

function BookListsGrid({ lists, loading }: { lists: BookList[]; loading: boolean }) {
  if (loading) return <Skeleton rows={4} />;
  if (lists.length === 0) {
    return <EmptyState title="暂无书单" description="收藏喜欢的书单，方便随时查看" action={<Link to="/">去发现</Link>} />;
  }
  return (
    <div className="profile-page__booklists">
      {lists.map((l) => (
        <div key={l.id} className="profile-page__booklist">
          <img src={l.cover} alt={l.title} className="profile-page__booklist-cover" loading="lazy" />
          <div className="profile-page__booklist-info">
            <h3 className="profile-page__booklist-title">{l.title}</h3>
            <p className="profile-page__booklist-desc">{l.desc}</p>
            <div className="profile-page__booklist-meta">
              <span>{l.bookCount} 本</span>
              <span>·</span>
              <span>{(l.followCount / 1000).toFixed(1)}k 关注</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- 打赏记录 ---------- */

function RewardRecords({ records, loading }: { records: RewardRecord[]; loading: boolean }) {
  if (loading) return <Skeleton rows={4} />;
  if (records.length === 0) {
    return <EmptyState title="暂无打赏记录" description="支持喜欢的作者，激励创作" />;
  }
  return (
    <ul className="profile-page__rewards">
      {records.map((r) => (
        <li key={r.id} className="profile-page__reward">
          <div className="profile-page__reward-icon">
            {r.type === 'ticket' ? '🎫' : r.type === 'recommend' ? '👍' : '☕'}
          </div>
          <div className="profile-page__reward-info">
            <Link to={`/book/${r.bookId}`} className="profile-page__reward-book">
              {r.bookTitle}
            </Link>
            <span className="profile-page__reward-time">{formatTime(r.createdAt)}</span>
          </div>
          <div className="profile-page__reward-amount">
            <span className="profile-page__reward-type-label">
              {r.type === 'ticket' ? '月票' : r.type === 'recommend' ? '推荐票' : '打赏'}
            </span>
            <span className="profile-page__reward-num">×{r.amount}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 设置入口 ---------- */

function SettingsEntry() {
  const settings = [
    { key: 'reading', label: '阅读偏好', desc: '默认字号、行距、主题' },
    { key: 'notifications', label: '消息通知', desc: '更新提醒、互动通知' },
    { key: 'privacy', label: '隐私设置', desc: '阅读历史、个性化推荐' },
    { key: 'account', label: '账号安全', desc: '密码、绑定、登录设备' },
    { key: 'about', label: '关于', desc: '版本信息、用户协议' },
  ];
  return (
    <ul className="profile-page__settings">
      {settings.map((s) => (
        <li key={s.key}>
          <button type="button" className="profile-page__setting-item" disabled>
            <div className="profile-page__setting-text">
              <div className="profile-page__setting-label">{s.label}</div>
              <div className="profile-page__setting-desc">{s.desc}</div>
            </div>
            <span className="profile-page__setting-arrow" aria-hidden>›</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 工具 ---------- */

function formatExpire(ts: number): string {
  const days = Math.max(0, Math.ceil((ts - Date.now()) / 86400000));
  return `${days}天`;
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const day = Math.floor(diff / 86400000);
  if (day < 1) return '今天';
  if (day < 30) return `${day}天前`;
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function groupByDay(items: ReadingHistoryItem[]): Record<string, ReadingHistoryItem[]> {
  const groups: Record<string, ReadingHistoryItem[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = today.getTime() - 86400000;
  const weekAgo = today.getTime() - 7 * 86400000;

  for (const item of items) {
    let label: string;
    if (item.readAt >= today.getTime()) label = '今天';
    else if (item.readAt >= yesterday) label = '昨天';
    else if (item.readAt >= weekAgo) label = '本周';
    else {
      const d = new Date(item.readAt);
      label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    (groups[label] ??= []).push(item);
  }
  return groups;
}
