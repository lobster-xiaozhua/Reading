/* ============================================================
 * BookMeta · 02 §1.16
 * 小说元信息组件：书名 / 作者 / 字数 / 章节 / 状态 / 更新时间 / 标签
 * detailed / compact 两种变体；统计数字使用 mono 等宽体
 * ============================================================ */

import type { MouseEvent } from "react";
import { Tag } from "./Tag.js";
import { ContentStatus, type ContentStatusType } from "./ContentStatus.js";

export interface BookMetaProps {
  title: string;
  author: string;
  wordCount?: number;
  chapterCount?: number;
  status?: ContentStatusType;
  updatedAt?: string | number | Date;
  tags?: string[];
  size?: "compact" | "detailed";
  onClick?: (e: MouseEvent<HTMLElement>) => void;
}

/** 字数格式化：<1万 显示原值；1万~1亿 显示「X.X万」；≥1亿 显示「X.X亿」 */
function formatWordCount(n: number): string {
  if (n < 10000) return `${n}`;
  if (n < 100000000) {
    const wan = n / 10000;
    return `${wan.toFixed(wan >= 100 ? 0 : 1)}万`;
  }
  const yi = n / 100000000;
  return `${yi.toFixed(yi >= 100 ? 0 : 1)}亿`;
}

/** 时间相对化：刚刚 / N 分钟前 / N 小时前 / N 天前 / 超过 30 天显示日期 */
function formatRelative(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  const now = Date.now();
  const diff = now - date.getTime();
  if (Number.isNaN(diff)) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  // 超过 30 天显示 YYYY-MM-DD
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const Separator = () => <span className="book-meta__stats-separator">·</span>;

export function BookMeta({
  title,
  author,
  wordCount,
  chapterCount,
  status,
  updatedAt,
  tags,
  size = "detailed",
  onClick,
}: BookMetaProps) {
  const isCompact = size === "compact";

  // 统计行内容
  const stats: string[] = [];
  if (wordCount != null) stats.push(`${formatWordCount(wordCount)} 字`);
  if (chapterCount != null) stats.push(`${chapterCount} 章`);
  const updatedText = updatedAt != null ? formatRelative(updatedAt) : "";
  if (updatedText) stats.push(updatedText);

  const titleNode = (
    <span
      className="book-meta__title"
      title={title}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(e as unknown as MouseEvent<HTMLElement>);
        }
      }}
    >
      {title}
    </span>
  );

  return (
    <div className={`book-meta book-meta--${size}`}>
      {/* 书名行 */}
      <div className="book-meta__title-row">
        {titleNode}
        {status ? (
          <ContentStatus status={status} size={isCompact ? "sm" : "md"} />
        ) : null}
      </div>

      {/* 作者行（仅 detailed） */}
      {!isCompact ? (
        <div className="book-meta__author" title={author}>
          {author}
        </div>
      ) : null}

      {/* 统计行 */}
      {stats.length > 0 ? (
        <div className="book-meta__stats">
          {stats.map((s, i) => (
            <span key={i} className="book-meta__stat">
              {i > 0 ? <Separator /> : null}
              {s}
            </span>
          ))}
        </div>
      ) : null}

      {/* 标签行（仅 detailed 且有 tags） */}
      {!isCompact && tags && tags.length > 0 ? (
        <div className="book-meta__tags">
          {tags.map((t) => (
            <Tag key={t} color="default">
              {t}
            </Tag>
          ))}
        </div>
      ) : null}
    </div>
  );
}
