/* ============================================================
 * CommentItem · 评论列表项组件
 * 包含评论信息、内容、点赞、回复
 * ============================================================ */

import { memo, useCallback, useState } from "react";
import { NovelHeart, NovelHeartFilled } from "@novel/icons";
import { LazyImage } from "@/components/LazyImage";
import { formatRelativeTime } from "@/utils/time";
import type { Comment } from "@/api/types";

interface CommentItemProps {
  comment: Comment;
}

export const CommentItem = memo(function CommentItem({
  comment: c,
}: CommentItemProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(c.likes);

  const handleLike = useCallback(() => {
    if (isLiked) {
      setIsLiked(false);
      setLikes((n) => n - 1);
    } else {
      setIsLiked(true);
      setLikes((n) => n + 1);
    }
  }, [isLiked]);

  return (
    <li className="book-detail__comment">
      <div className="book-detail__comment-header">
        <LazyImage
          src={c.user.avatar}
          alt={c.user.nickname}
          className="book-detail__comment-avatar"
        />
        <div className="book-detail__comment-meta">
          <span className="book-detail__comment-name">{c.user.nickname}</span>
          <span className="book-detail__comment-time">
            {formatRelativeTime(c.createdAt)}
          </span>
        </div>
        <span
          className="book-detail__comment-rating"
          aria-label={`评分 ${c.rating} 星`}
        >
          {"★".repeat(c.rating)}
          <span className="book-detail__comment-rating-empty">
            {"★".repeat(5 - c.rating)}
          </span>
        </span>
      </div>
      <p className="book-detail__comment-content">{c.content}</p>
      <div className="book-detail__comment-footer">
        <button
          type="button"
          className={`book-detail__comment-like ${isLiked ? "is-liked" : ""}`}
          onClick={handleLike}
        >
          {isLiked ? (
            <NovelHeartFilled size="sm" aria-hidden="true" />
          ) : (
            <NovelHeart size="sm" aria-hidden="true" />
          )}
          <span>{likes}</span>
        </button>
      </div>
      {c.replies && c.replies.length > 0 ? (
        <ul className="book-detail__replies">
          {c.replies.map((r) => (
            <li key={r.id} className="book-detail__reply">
              <LazyImage
                src={r.user.avatar}
                alt={r.user.nickname}
                className="book-detail__comment-avatar book-detail__comment-avatar--sm"
              />
              <div>
                <span className="book-detail__comment-name">
                  {r.user.nickname}
                </span>
                <span className="book-detail__comment-name book-detail__comment-name--author">
                  作者
                </span>
                <p className="book-detail__comment-content">{r.content}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
});
