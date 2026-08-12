import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* ============================================================
 * Comment · P6 §3
 * 楼中楼评论：头像 + 昵称 + 评分 + 内容 + 点赞/回复/删除
 * replies 缩进竖线；超 3 条折叠；软删除占位；depth 限制 2 层
 * ============================================================ */
import { useState } from "react";
import { Avatar } from "./Avatar.js";
import { RatingStars } from "./RatingStars.js";
/** 楼中楼最大嵌套层数（根 + 2 层回复） */
const MAX_DEPTH = 2;
/** 折叠阈值：超过 3 条回复折叠 */
const COLLAPSE_THRESHOLD = 3;
/** 相对时间格式化 */
function formatRelative(ts) {
    const diff = Date.now() - ts;
    if (Number.isNaN(diff) || diff < 0)
        return "";
    const min = Math.floor(diff / 60000);
    if (min < 1)
        return "刚刚";
    if (min < 60)
        return `${min} 分钟前`;
    const hour = Math.floor(min / 60);
    if (hour < 24)
        return `${hour} 小时前`;
    const day = Math.floor(hour / 24);
    if (day < 30)
        return `${day} 天前`;
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
}
export function Comment({ comment, showReplies = true, onLike, onReply, onDelete, depth = 0, className, }) {
    return (_jsx("div", { className: ["novel-comment", className ?? ""].filter(Boolean).join(" "), children: _jsx(CommentNode, { comment: comment, showReplies: showReplies, onLike: onLike, onReply: onReply, onDelete: onDelete, depth: depth }) }));
}
function CommentNode({ comment, showReplies, onLike, onReply, onDelete, depth, }) {
    const [expanded, setExpanded] = useState(false);
    /* 软删除：占位 */
    if (comment.deleted) {
        return _jsx("div", { className: "novel-comment__deleted", children: "\u8BE5\u8BC4\u8BBA\u5DF2\u5220\u9664" });
    }
    const replies = comment.replies ?? [];
    const canNest = depth < MAX_DEPTH;
    const showRepliesList = showReplies && canNest && replies.length > 0;
    const collapsedCount = replies.length - COLLAPSE_THRESHOLD;
    const visibleReplies = expanded || collapsedCount <= 0
        ? replies
        : replies.slice(0, COLLAPSE_THRESHOLD);
    const node = (_jsxs("div", { className: "novel-comment__node", children: [_jsx(Avatar, { src: comment.user.avatar, alt: comment.user.nickname, size: "md", className: "novel-comment__avatar" }), _jsxs("div", { className: "novel-comment__body", children: [_jsxs("div", { className: "novel-comment__head", children: [_jsx("span", { className: "novel-comment__name", children: comment.user.nickname }), comment.rating != null ? (_jsx(RatingStars, { value: comment.rating, readonly: true, size: "sm", showValue: true })) : null] }), _jsx("div", { className: "novel-comment__content", children: comment.content }), _jsxs("div", { className: "novel-comment__actions", children: [_jsx("span", { className: "novel-comment__time", children: formatRelative(comment.createdAt) }), _jsxs("button", { type: "button", className: `novel-comment__action ${comment.liked ? "is-liked" : ""}`, "aria-pressed": comment.liked, "aria-label": comment.liked ? "取消点赞" : "点赞", onClick: onLike ? () => onLike(comment.id) : undefined, children: [_jsx("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: comment.liked ? "currentColor" : "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round", "aria-hidden": true, children: _jsx("path", { d: "M12 21s-7.5-4.6-10-9.3C.4 8.4 2 5 5.2 5c2 0 3.3 1.1 4 2.3C9.9 6.1 11.2 5 13.2 5 16.4 5 18 8.4 16.4 11.7 14 16.4 12 21 12 21z" }) }), _jsx("span", { className: "novel-comment__like-count", children: comment.likes })] }), onReply ? (_jsx("button", { type: "button", className: "novel-comment__action", "aria-label": "\u56DE\u590D", onClick: () => onReply(comment.id), children: "\u56DE\u590D" })) : null, onDelete ? (_jsx("button", { type: "button", className: "novel-comment__action", "aria-label": "\u5220\u9664", onClick: () => onDelete(comment.id), children: "\u5220\u9664" })) : null] })] })] }));
    const repliesBlock = showRepliesList ? (_jsxs("div", { className: "novel-comment__replies", children: [visibleReplies.map((r) => (_jsx(CommentNode, { comment: r, showReplies: showReplies, onLike: onLike, onReply: onReply, onDelete: onDelete, depth: depth + 1 }, r.id))), collapsedCount > 0 && !expanded ? (_jsxs("button", { type: "button", className: "novel-comment__expand", onClick: () => setExpanded(true), children: ["\u5C55\u5F00 ", collapsedCount, " \u6761\u56DE\u590D"] })) : null] })) : null;
    /* depth>0 包一层 reply 容器，便于缩进与竖线 */
    if (depth === 0) {
        return (_jsxs(_Fragment, { children: [node, repliesBlock] }));
    }
    return (_jsxs("div", { className: "novel-comment__reply", children: [node, repliesBlock] }));
}
//# sourceMappingURL=Comment.js.map