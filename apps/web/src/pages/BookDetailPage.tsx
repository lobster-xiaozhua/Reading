/* ============================================================
 * P5-2 · 书籍详情页
 * 面包屑 + 封面/BookMeta/操作按钮 + 评分分布 + 目录
 * + 相关推荐 + 评论区 + 打赏占位
 * ============================================================ */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChapterList,
  EmptyState,
  RewardButton,
  Skeleton,
  Tabs,
  useAsyncState,
  useFeedback,
  type Chapter,
  type ChapterOrder,
} from "@novel/components";
import { NovelComment } from "@novel/icons";
import { fetcher } from "@/api/fetcher";
import type {
  BookSummary,
  ChapterSummary,
  Comment,
  RatingDistribution as RatingDist,
} from "@/api/types";
import { useUserStore } from "@/stores/userStore";
import { useHistoryStore } from "@/stores/historyStore";
import { BookDetailHero } from "./BookDetailPage/BookDetailHero";
import { BookDetailOverview } from "./BookDetailPage/BookDetailOverview";
import { BookDetailRelated } from "./BookDetailPage/BookDetailRelated";
import { CommentItem } from "./BookDetailPage/CommentItem";
import "./BookDetailPage.css";

type DetailTab = "chapters" | "comments" | "reward";

/** 稳定的空数组引用：避免 `?? []` 每次 render 产生新引用导致 useMemo 每帧重算 */
const EMPTY_CHAPTERS: ChapterSummary[] = [];
const EMPTY_RELATED: BookSummary[] = [];
const EMPTY_COMMENTS: Comment[] = [];

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
  const { bookId = "" } = useParams();
  const navigate = useNavigate();
  const feedback = useFeedback();
  const isInBookshelf = useUserStore((s) => s.isInBookshelf(bookId));
  const toggleBookshelf = useUserStore((s) => s.toggleBookshelf);
  const historyEntry = useHistoryStore((s) => s.entries[bookId]);
  const [order, setOrder] = useState<ChapterOrder>("asc");
  const [tab, setTab] = useState<DetailTab>("chapters");

  /* ---------- 数据加载：聚合接口 + 并行请求 ---------- */
  const fetchBookData = useCallback(async () => {
    const [detail, related, comments] = await Promise.allSettled([
      fetcher.getBookDetail(bookId),
      fetcher.getRelatedBooks(bookId),
      fetcher.getComments(bookId),
    ]);
    return {
      detail: detail.status === "fulfilled" ? detail.value : null,
      related: related.status === "fulfilled" ? related.value : [],
      comments: comments.status === "fulfilled" ? comments.value : [],
    };
  }, [bookId]);

  const bookState = useAsyncState<{
    detail: {
      book: BookSummary | null;
      chapters: ChapterSummary[];
      rating: RatingDist | null;
    } | null;
    related: BookSummary[];
    comments: Comment[];
  }>(fetchBookData, {
    deps: [bookId],
    loadingDelay: 200,
  });

  const detail = bookState.data?.detail ?? null;
  const book = detail?.book ?? null;
  const chapters = detail?.chapters ?? EMPTY_CHAPTERS;
  const rating = detail?.rating ?? null;
  const related = bookState.data?.related ?? EMPTY_RELATED;
  const comments = bookState.data?.comments ?? EMPTY_COMMENTS;

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
    feedback.message("success", isInBookshelf ? "已移出书架" : "已加入书架");
  };

  const handleStartReading = () => {
    const startChapter = historyEntry?.chapterId ?? chapters[0]?.id;
    if (!startChapter) return;
    navigate(`/read/${bookId}/${startChapter}`);
  };

  const handleSelectChapter = (ch: Chapter) => {
    navigate(`/read/${bookId}/${ch.id}`);
  };

  // 书籍不存在
  useEffect(() => {
    if (bookState.loaded && !bookState.data) {
      feedback.message("error", "书籍不存在或已下架");
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

  const enableVirtual = chapters.length > 100;

  return (
    <div className="book-detail">
      {/* 面包屑 */}
      <nav
        className="book-detail__breadcrumb container-page"
        aria-label="面包屑"
      >
        <ol>
          <li>
            <Link to="/">首页</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to={`/category?cat=${encodeURIComponent(book.category)}`}>
              {book.category}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">{book.title}</li>
        </ol>
      </nav>

      {/* 顶部：封面 + 元信息 + 操作 */}
      <BookDetailHero
        book={book}
        chapters={chapters}
        isInBookshelf={isInBookshelf}
        historyEntry={historyEntry}
        onToggleShelf={handleToggleShelf}
        onStartReading={handleStartReading}
      />

      <BookDetailOverview intro={book.intro} rating={rating} />

      {/* 目录 / 评论 / 打赏 Tab */}
      <section className="book-detail__tabs container-page">
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as DetailTab)}
          items={[
            {
              key: "chapters",
              label: `目录(${chapters.length})`,
              children: (
                <div className="book-detail__chapters">
                  {bookState.loading && chapters.length === 0 ? (
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
              key: "comments",
              label: `评论(${comments.length})`,
              children: (
                <CommentList
                  comments={comments}
                  loading={bookState.loading && comments.length === 0}
                />
              ),
            },
            {
              key: "reward",
              label: "打赏",
              children: <RewardSection bookId={bookId} />,
            },
          ]}
        />
      </section>

      {/* 相关推荐 */}
      <BookDetailRelated related={related} loading={bookState.loading} />
    </div>
  );
}

/* ---------- 评论列表 ---------- */

function CommentList({
  comments,
  loading,
}: {
  comments: Comment[];
  loading: boolean;
}) {
  const [writeOpen, setWriteOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(0);

  const handleSubmitComment = () => {
    setCommentText("");
    setCommentRating(0);
    setWriteOpen(false);
  };

  if (loading) return <Skeleton rows={5} />;

  return (
    <div className="book-detail__comments-wrap">
      {/* 写评论区域 */}
      <div className="book-detail__write-comment">
        {!writeOpen ? (
          <button
            type="button"
            className="book-detail__write-comment-trigger"
            onClick={() => setWriteOpen(true)}
          >
            <NovelComment size="sm" />
            <span>写评论...</span>
          </button>
        ) : (
          <div className="book-detail__write-comment-form">
            <div className="book-detail__write-comment-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`book-detail__star-btn ${star <= commentRating ? "is-active" : ""}`}
                  onClick={() => setCommentRating(star)}
                  aria-label={`${star}星`}
                >
                  {star <= commentRating ? "★" : "☆"}
                </button>
              ))}
            </div>
            <textarea
              className="book-detail__write-comment-input"
              placeholder="写下你的想法..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
            />
            <div className="book-detail__write-comment-actions">
              <button
                type="button"
                className="book-detail__write-comment-cancel"
                onClick={() => {
                  setWriteOpen(false);
                  setCommentText("");
                  setCommentRating(0);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="book-detail__write-comment-submit"
                disabled={!commentText.trim() || commentRating === 0}
                onClick={handleSubmitComment}
              >
                发表评论
              </button>
            </div>
          </div>
        )}
      </div>

      {comments.length === 0 ? (
        <EmptyState title="暂无评论，来抢沙发吧" />
      ) : (
        <ul className="book-detail__comments">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- 打赏区域 ---------- */

function RewardSection({ bookId }: { bookId: string }) {
  const [loading, setLoading] = useState<"ticket" | "recommend" | "tip" | null>(
    null,
  );
  const { message } = useFeedback();

  const handleReward = async (
    type: "ticket" | "recommend" | "tip",
    amount: number,
  ) => {
    setLoading(type);
    try {
      await fetcher.createReward(bookId, type, amount);
      message("success", "打赏成功，感谢支持！");
    } catch {
      message("error", "打赏失败，请稍后重试");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="book-detail__reward">
      <p className="book-detail__reward-text">支持作者，激励创作</p>
      <p className="book-detail__reward-hint">选择您的方式支持作者</p>
      <div
        className="book-detail__reward-actions"
        role="group"
        aria-label="打赏方式"
      >
        <RewardButton
          rewardType="ticket"
          count={1}
          loading={loading === "ticket"}
          onReward={handleReward}
        />
        <RewardButton
          rewardType="recommend"
          count={1}
          loading={loading === "recommend"}
          onReward={handleReward}
        />
        <RewardButton
          rewardType="tip"
          count={10}
          loading={loading === "tip"}
          onReward={handleReward}
        />
      </div>
    </div>
  );
}
