/* ============================================================
 * P5-9 · 追更管理页（03 §5.9）
 * 让读者一眼掌握所有追更小说的更新状态，快速进入新章节阅读。
 * 单列居中 max-width 720px。
 * ============================================================ */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  EmptyState,
  Modal,
  Tabs,
  useAsyncState,
  useFeedback,
  type TabItem,
} from "@novel/components";
import { NavigationBack } from "@novel/icons";
import { LazyImage } from "@/components/LazyImage";
import { fetcher } from "@/api/fetcher";
import type { FollowItem } from "@/api/types";
import "./FollowPage.css";

type FollowTabKey = "all" | "updated" | "unread" | "finished";

/** 左滑触发取消的距离（px） */
const SWIPE_THRESHOLD = 80;
/** 露出的"取消追更"按钮宽度（px） */
const ACTION_WIDTH = 88;
/** 骨架占位数量 */
const SKELETON_COUNT = 4;

import { formatRelativeTime } from "@/utils/time";

export default function FollowPage() {
  const navigate = useNavigate();
  const feedback = useFeedback();
  const [activeTab, setActiveTab] = useState<FollowTabKey>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [items, setItems] = useState<FollowItem[]>([]);

  const followState = useAsyncState<FollowItem[]>(
    () => fetcher.getFollowList(),
    { loadingDelay: 200 },
  );

  // 首次加载完成后同步到本地状态，后续取消追更 / 全部已读直接更新本地
  useEffect(() => {
    if (followState.data) setItems(followState.data);
  }, [followState.data]);

  // 前台回到页面时轮询刷新追更状态（连载更新提醒保鲜，避免切 Tab 回来数据过期）
  const refreshFollows = followState.run;
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshFollows();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshFollows]);

  const loading = followState.loading && items.length === 0;

  const counts = useMemo(
    () => ({
      all: items.length,
      updated: items.filter((i) => i.status === "updated").length,
      unread: items.filter((i) => i.unreadCount > 0).length,
      finished: items.filter((i) => i.finished).length,
    }),
    [items],
  );

  const visibleItems = useMemo(() => {
    switch (activeTab) {
      case "updated":
        return items.filter((i) => i.status === "updated");
      case "unread":
        return items.filter((i) => i.unreadCount > 0);
      case "finished":
        return items.filter((i) => i.finished);
      default:
        return items;
    }
  }, [items, activeTab]);

  const tabItems: TabItem[] = [
    {
      key: "all",
      label: <TabLabel label="全部" count={counts.all} />,
      children: <></>,
    },
    {
      key: "updated",
      label: <TabLabel label="已更新" count={counts.updated} />,
      children: <></>,
    },
    {
      key: "unread",
      label: <TabLabel label="未读" count={counts.unread} />,
      children: <></>,
    },
    {
      key: "finished",
      label: <TabLabel label="已完结" count={counts.finished} />,
      children: <></>,
    },
  ];

  const handleUnfollow = async (bookId: string) => {
    try {
      // 追更列表源于书架：取消追更 = 移出书架，需同步后端避免刷新后恢复
      await fetcher.removeFromBookshelf(bookId);
      setItems((prev) => prev.filter((i) => i.bookId !== bookId));
      feedback.message("success", "已取消追更");
    } catch {
      feedback.message("error", "取消追更失败，请稍后重试");
    }
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((i) => ({ ...i, unreadCount: 0 })));
    setConfirmOpen(false);
    try {
      await fetcher.readAllFollows?.();
    } catch {
      // 静默失败，前端已同步清空未读数
    }
  };

  return (
    <div className="follow-page fade-in">
      {/* 顶部栏 */}
      <header className="follow-page__header">
        <button
          type="button"
          className="follow-page__back"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <NavigationBack />
        </button>
        <h1 className="follow-page__heading">追更管理</h1>
        <button
          type="button"
          className="follow-page__read-all"
          onClick={() => setConfirmOpen(true)}
          aria-label="全部已读"
          disabled={items.length === 0}
        >
          全部已读
        </button>
      </header>

      {/* Tab 切换 */}
      <section className="follow-page__tabs">
        <Tabs
          activeKey={activeTab}
          items={tabItems}
          onChange={(k) => setActiveTab(k as FollowTabKey)}
        />
      </section>

      {/* 列表 */}
      <section className="follow-page__body" aria-label="追更列表">
        {loading ? (
          <ul className="follow-page__list">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <FollowItemSkeleton key={i} />
            ))}
          </ul>
        ) : items.length === 0 ? (
          <EmptyState
            title="还没有追更的书籍"
            description="追更喜欢的书，第一时间获取更新提醒"
            action={
              <Link to="/" className="follow-page__discover-btn">
                去发现好书
              </Link>
            }
          />
        ) : visibleItems.length === 0 ? (
          <EmptyState title="该分类下暂无追更" description="切换其他分类查看" />
        ) : (
          <ul className="follow-page__list">
            {visibleItems.map((item) => (
              <FollowListItem
                key={item.bookId}
                item={item}
                onUnfollow={handleUnfollow}
              />
            ))}
          </ul>
        )}
      </section>

      {/* 底部统计 */}
      {items.length > 0 ? (
        <footer className="follow-page__stats">
          共 {items.length} 本 · {counts.updated} 本有更新
        </footer>
      ) : null}

      {/* 全部已读确认弹窗 */}
      <Modal
        open={confirmOpen}
        title="全部已读"
        onCancel={() => setConfirmOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="follow-page__modal-btn follow-page__modal-btn--ghost"
              onClick={() => setConfirmOpen(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="follow-page__modal-btn follow-page__modal-btn--primary"
              onClick={handleMarkAllRead}
            >
              确认
            </button>
          </>
        }
      >
        <p className="follow-page__modal-text">
          确认将所有追更书籍标记为已读？
        </p>
      </Modal>
    </div>
  );
}

/* ---------- Tab 标签（带数量徽标） ---------- */
function TabLabel({ label, count }: { label: string; count: number }) {
  return (
    <span className="follow-page__tab-label">
      {label}
      <span className="follow-page__tab-count">{count}</span>
    </span>
  );
}

/* ---------- 追更列表项 ---------- */
function FollowListItem({
  item,
  onUnfollow,
}: {
  item: FollowItem;
  onUnfollow: (bookId: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);
  const drag = useRef({
    startX: 0,
    startY: 0,
    dragging: false,
    moved: false,
    locked: false,
    horizontal: false,
    captured: false,
    lastOffset: 0,
  });

  const updated = item.status === "updated";
  // 红点与「未读」tab 计数一致：有未读即显示（不局限于"有更新"状态）
  const showUnreadDot = item.unreadCount > 0;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current.startX = e.clientX;
    drag.current.startY = e.clientY;
    drag.current.dragging = true;
    drag.current.moved = false;
    drag.current.locked = false;
    drag.current.horizontal = false;
    drag.current.captured = false;
    drag.current.lastOffset = 0;
    setAnimating(false);
    setOffset(0);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.dragging) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (!drag.current.locked) {
      // 方向锁定：超过阈值后判定为水平或垂直
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        drag.current.locked = true;
        drag.current.horizontal = Math.abs(dx) > Math.abs(dy);
      } else {
        return;
      }
    }
    if (!drag.current.horizontal) return;
    // 水平滑动：阻止垂直滚动并独占指针
    e.preventDefault();
    if (!drag.current.captured) {
      drag.current.captured = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    const next = Math.max(-ACTION_WIDTH - 24, Math.min(0, dx));
    drag.current.lastOffset = next;
    drag.current.moved = Math.abs(dx) > 8;
    setOffset(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.dragging) return;
    drag.current.dragging = false;
    if (drag.current.captured) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      drag.current.captured = false;
    }
    setAnimating(true);
    // 滑动距离 ≥ 阈值 → 显示确认取消，不直接取消
    if (
      drag.current.horizontal &&
      drag.current.lastOffset <= -SWIPE_THRESHOLD
    ) {
      setConfirmUnfollow(true);
    }
    // 回弹（dur-fast 150ms）
    setOffset(0);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 若发生过拖拽，阻止跳转
    if (drag.current.moved) {
      e.preventDefault();
      drag.current.moved = false;
    }
  };

  // 桌面端：hover 露出"取消追更"按钮
  const onPointerEnter = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "mouse") return;
    if (drag.current.dragging) return;
    setAnimating(true);
    setOffset(-ACTION_WIDTH);
  };
  const onPointerLeave = (e: React.PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== "mouse") return;
    if (drag.current.dragging) return;
    setAnimating(true);
    setOffset(0);
  };

  return (
    <li
      className="follow-page__item"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        type="button"
        className={`follow-page__item-action ${confirmUnfollow ? "is-confirm" : ""}`}
        aria-label={`取消追更 ${item.title}`}
        onClick={() => {
          if (confirmUnfollow) {
            onUnfollow(item.bookId);
          } else {
            setConfirmUnfollow(true);
          }
        }}
        onMouseLeave={() => setConfirmUnfollow(false)}
      >
        {confirmUnfollow ? "确认取消" : "取消追更"}
      </button>
      <div
        className={`follow-page__item-content ${animating ? "is-animating" : ""}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <Link
          to={`/read/${item.bookId}`}
          className="follow-page__item-link"
          onClick={handleClick}
          aria-label={`阅读 ${item.title}`}
        >
          <div className="follow-page__cover">
            <LazyImage src={item.cover} alt={item.title} />
            {showUnreadDot ? (
              <span className="follow-page__dot" aria-hidden>
                {item.unreadCount}
              </span>
            ) : null}
          </div>
          <div className="follow-page__info">
            <div className="follow-page__book-title">{item.title}</div>
            {item.author ? (
              <div className="follow-page__author">{item.author}</div>
            ) : null}
            <div className="follow-page__latest">
              最新：{item.latestChapterTitle}
            </div>
            <div className="follow-page__time">
              {formatRelativeTime(item.latestTime)}
            </div>
            <div className="follow-page__badges">
              {updated && item.unreadCount > 0 ? (
                <span className="follow-page__badge follow-page__badge--updated">
                  更新 {item.unreadCount} 章
                </span>
              ) : null}
              {item.finished ? (
                <span className="follow-page__badge follow-page__badge--finished">
                  已完结
                </span>
              ) : null}
            </div>
          </div>
        </Link>
      </div>
    </li>
  );
}

/* ---------- 骨架列表项 ---------- */
function FollowItemSkeleton() {
  return (
    <li className="follow-page__item follow-page__item--skeleton" aria-hidden>
      <div className="follow-page__item-content follow-page__skeleton-content">
        <div className="follow-page__cover follow-page__skeleton-cover" />
        <div className="follow-page__info">
          <div className="follow-page__skeleton-line follow-page__skeleton-line--lg" />
          <div className="follow-page__skeleton-line follow-page__skeleton-line--md" />
          <div className="follow-page__skeleton-line follow-page__skeleton-line--sm" />
        </div>
      </div>
    </li>
  );
}
