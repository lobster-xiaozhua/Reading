/* ============================================================
 * Comment · P6 §3
 * 楼中楼评论：头像 + 昵称 + 评分 + 内容 + 点赞/回复/删除
 * replies 缩进竖线；超 3 条折叠；软删除占位；depth 限制 2 层
 * ============================================================ */

import { useState } from "react";
import { Avatar } from "./Avatar.js";
import { RatingStars } from "./RatingStars.js";

export interface CommentData {
  id: string;
  user: { id: string; nickname: string; avatar: string };
  rating?: number;
  content: string;
  likes: number;
  liked?: boolean;
  createdAt: number;
  replies?: CommentData[];
  deleted?: boolean;
}

export interface CommentProps {
  comment: CommentData;
  /** 是否展开楼中楼回复，默认 true */
  showReplies?: boolean;
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** 当前层级，根评论为 0；限制 2 层（即回复嵌套到 depth 2） */
  depth?: number;
  className?: string;
}

/** 楼中楼最大嵌套层数（根 + 2 层回复） */
const MAX_DEPTH = 2;
/** 折叠阈值：超过 3 条回复折叠 */
const COLLAPSE_THRESHOLD = 3;

/** 相对时间格式化 */
function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (Number.isNaN(diff) || diff < 0) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function Comment({
  comment,
  showReplies = true,
  onLike,
  onReply,
  onDelete,
  depth = 0,
  className,
}: CommentProps) {
  return (
    <div
      className={["novel-comment", className ?? ""].filter(Boolean).join(" ")}
    >
      <CommentNode
        comment={comment}
        showReplies={showReplies}
        onLike={onLike}
        onReply={onReply}
        onDelete={onDelete}
        depth={depth}
      />
    </div>
  );
}

function CommentNode({
  comment,
  showReplies,
  onLike,
  onReply,
  onDelete,
  depth,
}: {
  comment: CommentData;
  showReplies: boolean;
  onLike?: (id: string) => void;
  onReply?: (id: string) => void;
  onDelete?: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);

  /* 软删除：占位 */
  if (comment.deleted) {
    return <div className="novel-comment__deleted">该评论已删除</div>;
  }

  const replies = comment.replies ?? [];
  const canNest = depth < MAX_DEPTH;
  const showRepliesList = showReplies && canNest && replies.length > 0;
  const collapsedCount = replies.length - COLLAPSE_THRESHOLD;
  const visibleReplies =
    expanded || collapsedCount <= 0
      ? replies
      : replies.slice(0, COLLAPSE_THRESHOLD);

  const node = (
    <div className="novel-comment__node">
      <Avatar
        src={comment.user.avatar}
        alt={comment.user.nickname}
        size="md"
        className="novel-comment__avatar"
      />
      <div className="novel-comment__body">
        <div className="novel-comment__head">
          <span className="novel-comment__name">{comment.user.nickname}</span>
          {comment.rating != null ? (
            <RatingStars value={comment.rating} readonly size="sm" showValue />
          ) : null}
        </div>
        <div className="novel-comment__content">{comment.content}</div>
        <div className="novel-comment__actions">
          <span className="novel-comment__time">
            {formatRelative(comment.createdAt)}
          </span>
          <button
            type="button"
            className={`novel-comment__action ${comment.liked ? "is-liked" : ""}`}
            aria-pressed={comment.liked}
            aria-label={comment.liked ? "取消点赞" : "点赞"}
            onClick={onLike ? () => onLike(comment.id) : undefined}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill={comment.liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2 5 5.2 5c2 0 3.3 1.1 4 2.3C9.9 6.1 11.2 5 13.2 5 16.4 5 18 8.4 16.4 11.7 14 16.4 12 21 12 21z" />
            </svg>
            <span className="novel-comment__like-count">{comment.likes}</span>
          </button>
          {onReply ? (
            <button
              type="button"
              className="novel-comment__action"
              aria-label="回复"
              onClick={() => onReply(comment.id)}
            >
              回复
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="novel-comment__action"
              aria-label="删除"
              onClick={() => onDelete(comment.id)}
            >
              删除
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const repliesBlock = showRepliesList ? (
    <div className="novel-comment__replies">
      {visibleReplies.map((r) => (
        <CommentNode
          key={r.id}
          comment={r}
          showReplies={showReplies}
          onLike={onLike}
          onReply={onReply}
          onDelete={onDelete}
          depth={depth + 1}
        />
      ))}
      {collapsedCount > 0 && !expanded ? (
        <button
          type="button"
          className="novel-comment__expand"
          onClick={() => setExpanded(true)}
        >
          展开 {collapsedCount} 条回复
        </button>
      ) : null}
    </div>
  ) : null;

  /* depth>0 包一层 reply 容器，便于缩进与竖线 */
  if (depth === 0) {
    return (
      <>
        {node}
        {repliesBlock}
      </>
    );
  }
  return (
    <div className="novel-comment__reply">
      {node}
      {repliesBlock}
    </div>
  );
}
