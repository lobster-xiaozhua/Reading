/* ============================================================
 * P5-6 · 个人中心
 * UserCard（头像/昵称/等级/VIP/统计）+ Tab 切换：
 *   书架 / 阅读历史 / 书单 / 打赏记录 / 设置
 * URL 同步：?tab=bookshelf|history|booklists|rewards|settings
 * ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Avatar,
  Bookshelf,
  EmptyState,
  Modal,
  Skeleton,
  Tabs,
  useAsyncState,
  useReaderSettings,
  type Book,
  type ReaderFontSize,
  type ReaderFontFamily,
  type ReaderLineHeight,
  type ReaderTheme,
  type ReaderPageMode,
} from "@novel/components";
import {
  NovelReward,
  NovelThumbsUp,
  NovelHeart,
  ActionEdit,
  NavigationChevronRight,
} from "@novel/icons";
import { LazyImage } from "@/components/LazyImage";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { fetcher } from "@/api/fetcher";
import type {
  BookList,
  BookSummary,
  BookshelfTab,
  ReadingHistoryItem,
  RewardRecord,
  UserProfile,
} from "@/api/types";
import { toBook as toBookBase } from "@/utils/convert";
import { formatRelativeTime } from "@/utils/time";
import { useUserStore } from "@/stores/userStore";
import { useHistoryStore } from "@/stores/historyStore";
import "./ProfilePage.css";

type ProfileTab =
  "bookshelf" | "history" | "booklists" | "rewards" | "settings";

const TABS: { key: ProfileTab; label: string }[] = [
  { key: "bookshelf", label: "我的书架" },
  { key: "history", label: "阅读历史" },
  { key: "booklists", label: "我的书单" },
  { key: "rewards", label: "打赏记录" },
  { key: "settings", label: "设置" },
];

const SHELF_TABS: { key: BookshelfTab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "ongoing", label: "连载中" },
  { key: "completed", label: "已完结" },
  { key: "recent", label: "最近阅读" },
];

function toBook(
  b: BookSummary,
  lastReadTime?: number,
  progress?: number,
): Book {
  return { ...toBookBase(b), lastReadTime, progress: progress ?? 0 };
}

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = (searchParams.get("tab") as ProfileTab) ?? "bookshelf";

  const user = useUserStore((s) => s.profile);
  const historyEntries = useHistoryStore((s) => s.entries);

  /* ---------- 用户数据 ---------- */
  const userState = useAsyncState<UserProfile>(() => fetcher.getCurrentUser(), {
    initial: user ?? undefined,
    loadingDelay: 200,
  });
  const profile = userState.data ?? user;

  const [editOpen, setEditOpen] = useState(false);
  const [editNickname, setEditNickname] = useState("");

  /* 打开编辑弹窗时同步当前昵称 */
  useEffect(() => {
    if (editOpen) setEditNickname(profile?.nickname ?? "");
  }, [editOpen, profile?.nickname]);

  const handleSaveProfile = async () => {
    try {
      await fetcher.updateProfile({ nickname: editNickname.trim() || undefined });
      await userState.run();
      setEditOpen(false);
    } catch {
      // 保存失败保持弹窗，由上层 toast 提示
    }
  };

  /* ---------- 书架 ---------- */
  const [shelfTab, setShelfTab] = useState<BookshelfTab>(
    () => (searchParams.get("shelf") as BookshelfTab) ?? "all",
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

  /* ---------- 阅读历史（懒加载：进入对应 tab 才请求） ---------- */
  const historyState = useAsyncState<ReadingHistoryItem[]>(
    () => fetcher.getReadingHistory(),
    { initial: [] as ReadingHistoryItem[], loadingDelay: 200, immediate: false },
  );
  const histories = historyState.data ?? [];

  /* ---------- 书单（懒加载） ---------- */
  const bookListsState = useAsyncState<BookList[]>(
    () => fetcher.getBookLists(),
    { initial: [] as BookList[], loadingDelay: 200, immediate: false },
  );
  const bookLists = bookListsState.data ?? [];

  /* ---------- 打赏记录（懒加载） ---------- */
  const rewardsState = useAsyncState<RewardRecord[]>(
    () => fetcher.getRewardRecords(),
    { initial: [] as RewardRecord[], loadingDelay: 200, immediate: false },
  );
  const rewards = rewardsState.data ?? [];

  /* 非默认 tab 首次激活时触发对应数据加载 */
  useEffect(() => {
    if (tab === "history" && !historyState.loaded) historyState.run();
    else if (tab === "booklists" && !bookListsState.loaded) bookListsState.run();
    else if (tab === "rewards" && !rewardsState.loaded) rewardsState.run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* ---------- 切换 Tab ---------- */
  const handleTabChange = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next, { replace: false });
  };

  const handleBookClick = (book: Book) => {
    navigate(`/book/${book.id}`);
  };

  return (
    <div className="profile-page container-page fade-in">
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
                    VIP
                    {profile.vipExpireAt
                      ? ` · ${formatExpire(profile.vipExpireAt)}`
                      : ""}
                  </span>
                ) : null}
                <span className="profile-page__level">Lv.{profile.level}</span>
              </div>
              <div className="profile-page__user-stats">
                <div className="profile-page__stat">
                  <span className="profile-page__stat-value">
                    <AnimatedNumber value={profile.stats.readingDays} suffix="天" />
                  </span>
                  <span className="profile-page__stat-label">连续阅读</span>
                </div>
                <div className="profile-page__stat">
                  <span className="profile-page__stat-value">
                    <AnimatedNumber value={Math.floor(profile.stats.readingMinutes / 60)} suffix="h" />
                  </span>
                  <span className="profile-page__stat-label">阅读时长</span>
                </div>
                <div className="profile-page__stat">
                  <span className="profile-page__stat-value">
                    <AnimatedNumber value={Math.floor(profile.stats.readWords / 10000)} suffix="万" />
                  </span>
                  <span className="profile-page__stat-label">阅读字数</span>
                </div>
                <div className="profile-page__stat">
                  <span className="profile-page__stat-value">
                    <AnimatedNumber value={profile.stats.bookshelfCount} />
                  </span>
                  <span className="profile-page__stat-label">书架</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="profile-page__edit-btn"
              onClick={() => setEditOpen(true)}
              aria-label="编辑资料"
            >
              <ActionEdit size="sm" />
            </button>
          </div>
        ) : null}
      </section>

      {/* 编辑资料弹窗 */}
      <Modal
        open={editOpen}
        title="编辑资料"
        onCancel={() => setEditOpen(false)}
        footer={
          <button
            type="button"
            className="profile-page__modal-btn profile-page__modal-btn--primary"
            onClick={handleSaveProfile}
          >
            保存
          </button>
        }
      >
        <div className="profile-page__edit-form">
          <div className="profile-page__edit-field">
            <label className="profile-page__edit-label">昵称</label>
            <input
              className="profile-page__edit-input"
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value)}
              placeholder="输入昵称"
            />
          </div>
          <div className="profile-page__edit-field">
            <label className="profile-page__edit-label">简介</label>
            <textarea
              className="profile-page__edit-input profile-page__edit-textarea"
              defaultValue={profile?.bio ?? ""}
              placeholder="一句话介绍自己"
              rows={3}
            />
          </div>
          <div className="profile-page__edit-field">
            <label className="profile-page__edit-label">头像</label>
            <div className="profile-page__edit-avatar-row">
              <Avatar src={profile?.avatar} alt="" size="md" />
              <button type="button" className="profile-page__edit-upload-btn">
                更换头像
              </button>
            </div>
          </div>
        </div>
      </Modal>

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
        {tab === "bookshelf" ? (
          <BookshelfTabContent
            books={shelfBooks}
            loading={shelfState.loading && shelfBooks.length === 0}
            shelfTab={shelfTab}
            onShelfTabChange={setShelfTab}
            onBookClick={handleBookClick}
          />
        ) : null}

        {tab === "history" ? (
          <HistoryTimeline
            histories={histories}
            loading={historyState.loading && histories.length === 0}
          />
        ) : null}

        {tab === "booklists" ? (
          <BookListsGrid
            lists={bookLists}
            loading={bookListsState.loading && bookLists.length === 0}
          />
        ) : null}

        {tab === "rewards" ? (
          <RewardRecords
            records={rewards}
            loading={rewardsState.loading && rewards.length === 0}
          />
        ) : null}

        {tab === "settings" ? <SettingsEntry /> : null}
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
    return (
      <EmptyState
        title="暂无阅读历史"
        description="开始阅读后这里会显示记录"
        action={<Link to="/">去找本书</Link>}
      />
    );
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
                <Link
                  to={`/book/${h.bookId}`}
                  className="profile-page__timeline-cover"
                >
                  <LazyImage src={h.book.cover} alt={h.book.title} />
                </Link>
                <div className="profile-page__timeline-info">
                  <Link
                    to={`/book/${h.bookId}`}
                    className="profile-page__timeline-title"
                  >
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

function BookListsGrid({
  lists,
  loading,
}: {
  lists: BookList[];
  loading: boolean;
}) {
  if (loading) return <Skeleton rows={4} />;
  if (lists.length === 0) {
    return (
      <EmptyState
        title="暂无书单"
        description="收藏喜欢的书单，方便随时查看"
        action={<Link to="/">去发现</Link>}
      />
    );
  }
  return (
    <div className="profile-page__booklists">
      {lists.map((l) => (
        <div key={l.id} className="profile-page__booklist">
          <LazyImage
            src={l.cover}
            alt={l.title}
            className="profile-page__booklist-cover"
          />
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

function RewardRecords({
  records,
  loading,
}: {
  records: RewardRecord[];
  loading: boolean;
}) {
  if (loading) return <Skeleton rows={4} />;
  if (records.length === 0) {
    return (
      <EmptyState title="暂无打赏记录" description="支持喜欢的作者，激励创作" />
    );
  }
  return (
    <ul className="profile-page__rewards">
      {records.map((r) => (
        <li key={r.id} className="profile-page__reward">
          <div className="profile-page__reward-icon">
            {r.type === "ticket" ? (
              <NovelReward size="sm" aria-hidden="true" />
            ) : r.type === "recommend" ? (
              <NovelThumbsUp size="sm" aria-hidden="true" />
            ) : (
              <NovelHeart size="sm" aria-hidden="true" />
            )}
          </div>
          <div className="profile-page__reward-info">
            <Link
              to={`/book/${r.bookId}`}
              className="profile-page__reward-book"
            >
              {r.bookTitle}
            </Link>
            <span className="profile-page__reward-time">
              {formatRelativeTime(r.createdAt)}
            </span>
          </div>
          <div className="profile-page__reward-amount">
            <span className="profile-page__reward-type-label">
              {r.type === "ticket"
                ? "月票"
                : r.type === "recommend"
                  ? "推荐票"
                  : "打赏"}
            </span>
            <span className="profile-page__reward-num">×{r.amount}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 设置入口 ---------- */

const FONT_SIZE_OPTIONS: ReaderFontSize[] = [14, 16, 18, 20, 22, 24];
const FONT_SIZE_LABEL: Record<ReaderFontSize, string> = {
  14: "小", 16: "中", 18: "大", 20: "较大", 22: "很大", 24: "最大",
};
const LINE_HEIGHT_LABEL: Record<ReaderLineHeight, string> = {
  compact: "紧凑", standard: "标准", loose: "宽松",
};
const FONT_FAMILY_LABEL: Record<ReaderFontFamily, string> = {
  serif: "默认", song: "宋体", hei: "黑体", kai: "楷体",
};
const THEME_LABEL: Record<ReaderTheme, string> = {
  day: "日间", night: "夜间", eye: "护眼", parchment: "羊皮纸",
};
const THEME_PREVIEW: Record<ReaderTheme, { bg: string; text: string }> = {
  day: { bg: "var(--color-bg-surface)", text: "var(--color-text-primary)" },
  night: { bg: "var(--read-bg-night)", text: "var(--read-text-night)" },
  eye: { bg: "var(--read-bg-day)", text: "var(--read-text-day)" },
  parchment: { bg: "var(--novel-read-bg)", text: "var(--novel-read-text)" },
};
const PAGE_MODE_LABEL: Record<ReaderPageMode, string> = {
  scroll: "滚动", slide: "滑动", click: "点击",
};

function SettingsEntry() {
  const [settingsOpen, setSettingsOpen] = useState<string | null>(null);
  const { settings, update, reset } = useReaderSettings();

  const settingsList = [
    { key: "reading", label: "阅读偏好", desc: "字号、行距、字体、主题、翻页", comingSoon: false },
    { key: "notifications", label: "消息通知", desc: "更新提醒、互动通知", comingSoon: true },
    { key: "privacy", label: "隐私设置", desc: "阅读历史、个性化推荐", comingSoon: true },
    { key: "account", label: "账号安全", desc: "密码、绑定、登录设备", comingSoon: true },
    { key: "about", label: "关于", desc: "版本信息、用户协议", comingSoon: false },
  ];

  const handleClick = (key: string) => {
    if (key === "reading" || key === "about") setSettingsOpen(key);
  };

  return (
    <>
      <ul className="profile-page__settings">
        {settingsList.map((s) => {
          const clickable = s.key === "reading" || s.key === "about";
          return (
            <li key={s.key}>
              <button
                type="button"
                className={`profile-page__setting-item ${clickable ? "is-clickable" : ""}`}
                disabled={!clickable}
                onClick={() => handleClick(s.key)}
              >
                <div className="profile-page__setting-text">
                  <div className="profile-page__setting-label">{s.label}</div>
                  <div className="profile-page__setting-desc">{s.desc}</div>
                </div>
                {s.comingSoon ? (
                  <span className="profile-page__setting-coming-soon">即将上线</span>
                ) : null}
                <NavigationChevronRight size="sm" className="profile-page__setting-arrow" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <Modal
        open={settingsOpen === "reading"}
        title="阅读偏好"
        onCancel={() => setSettingsOpen(null)}
        width={400}
        footer={
          <div className="profile-page__settings-footer">
            <button
              type="button"
              className="profile-page__modal-btn"
              onClick={reset}
            >
              重置默认
            </button>
            <button
              type="button"
              className="profile-page__modal-btn profile-page__modal-btn--primary"
              onClick={() => setSettingsOpen(null)}
            >
              完成
            </button>
          </div>
        }
      >
        <div className="profile-page__settings-modal">
          {/* 字号 */}
          <div className="profile-page__settings-group">
            <label className="profile-page__settings-group-label">字号</label>
            <div className="profile-page__fontsize-control">
              <button
                type="button"
                className="profile-page__fontsize-btn"
                disabled={settings.fontSize === 14}
                onClick={() => {
                  const idx = FONT_SIZE_OPTIONS.indexOf(settings.fontSize);
                  if (idx > 0) update("fontSize", FONT_SIZE_OPTIONS[idx - 1]!);
                }}
                aria-label="减小字号"
              >A-</button>
              <span className="profile-page__fontsize-value">
                {settings.fontSize}
                <span className="profile-page__fontsize-label">
                  {FONT_SIZE_LABEL[settings.fontSize]}
                </span>
              </span>
              <button
                type="button"
                className="profile-page__fontsize-btn"
                disabled={settings.fontSize === 24}
                onClick={() => {
                  const idx = FONT_SIZE_OPTIONS.indexOf(settings.fontSize);
                  if (idx < FONT_SIZE_OPTIONS.length - 1) update("fontSize", FONT_SIZE_OPTIONS[idx + 1]!);
                }}
                aria-label="增大字号"
              >A+</button>
            </div>
          </div>

          {/* 行距 */}
          <div className="profile-page__settings-group">
            <label className="profile-page__settings-group-label">行距</label>
            <div className="profile-page__segmented" role="radiogroup" aria-label="行距">
              {(["compact", "standard", "loose"] as ReaderLineHeight[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={settings.lineHeight === v}
                  className={`profile-page__segmented-item ${settings.lineHeight === v ? "is-active" : ""}`}
                  onClick={() => update("lineHeight", v)}
                >{LINE_HEIGHT_LABEL[v]}</button>
              ))}
            </div>
          </div>

          {/* 字体 */}
          <div className="profile-page__settings-group">
            <label className="profile-page__settings-group-label">字体</label>
            <div className="profile-page__segmented" role="radiogroup" aria-label="字体">
              {(["serif", "song", "hei", "kai"] as ReaderFontFamily[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={settings.fontFamily === v}
                  className={`profile-page__segmented-item ${settings.fontFamily === v ? "is-active" : ""}`}
                  onClick={() => update("fontFamily", v)}
                >{FONT_FAMILY_LABEL[v]}</button>
              ))}
            </div>
          </div>

          {/* 主题 */}
          <div className="profile-page__settings-group">
            <label className="profile-page__settings-group-label">主题</label>
            <div className="profile-page__theme-grid" role="radiogroup" aria-label="主题">
              {(["day", "night", "eye", "parchment"] as ReaderTheme[]).map((v) => {
                const preview = THEME_PREVIEW[v];
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={settings.theme === v}
                    className={`profile-page__theme-item ${settings.theme === v ? "is-active" : ""}`}
                    onClick={() => update("theme", v)}
                  >
                    <span
                      className="profile-page__theme-swatch"
                      style={{ background: preview.bg, color: preview.text }}
                      aria-hidden="true"
                    >Aa</span>
                    <span className="profile-page__theme-name">{THEME_LABEL[v]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 翻页模式 */}
          <div className="profile-page__settings-group">
            <label className="profile-page__settings-group-label">翻页方式</label>
            <div className="profile-page__segmented" role="radiogroup" aria-label="翻页方式">
              {(["scroll", "slide", "click"] as ReaderPageMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={settings.pageMode === v}
                  className={`profile-page__segmented-item ${settings.pageMode === v ? "is-active" : ""}`}
                  onClick={() => update("pageMode", v)}
                >{PAGE_MODE_LABEL[v]}</button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={settingsOpen === "about"}
        title="关于"
        onCancel={() => setSettingsOpen(null)}
        footer={
          <button
            type="button"
            className="profile-page__modal-btn profile-page__modal-btn--primary"
            onClick={() => setSettingsOpen(null)}
          >
            知道了
          </button>
        }
      >
        <div className="profile-page__settings-modal">
          <p className="profile-page__settings-modal-text">
            Novel Reader v1.0.0
          </p>
          <p className="profile-page__settings-modal-desc">
            沉浸式网络文学阅读平台，致力于为读者提供优质的阅读体验。
          </p>
          <p className="profile-page__settings-modal-desc">
            特别感谢所有贡献者和早期用户的反馈与支持。
          </p>
        </div>
      </Modal>
    </>
  );
}

/* ---------- 工具 ---------- */

function formatExpire(ts: number): string {
  const days = Math.max(0, Math.ceil((ts - Date.now()) / 86400000));
  return `${days}天`;
}

function groupByDay(
  items: ReadingHistoryItem[],
): Record<string, ReadingHistoryItem[]> {
  const groups: Record<string, ReadingHistoryItem[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = today.getTime() - 86400000;
  const weekAgo = today.getTime() - 7 * 86400000;

  for (const item of items) {
    let label: string;
    if (item.readAt >= today.getTime()) label = "今天";
    else if (item.readAt >= yesterday) label = "昨天";
    else if (item.readAt >= weekAgo) label = "本周";
    else {
      const d = new Date(item.readAt);
      label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    (groups[label] ??= []).push(item);
  }
  return groups;
}
