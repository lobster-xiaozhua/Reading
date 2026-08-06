/* ============================================================
 * P2-20 · ContentReview 内容审核流程
 * items[] + mode single/batch + history Timeline + onApprove/onReject/onRevise
 * 驳回必填原因分类 + 说明 ≥10 字；批量模式底部 BatchActionBar
 * Source: 04 §6.20
 * ============================================================ */

import { forwardRef, useMemo, useState } from "react";
import {
  Card,
  Space,
  Button,
  Input,
  Select,
  Timeline,
  Empty,
  Tag,
  Tooltip,
} from "antd";
import type { AuditResult, RejectReason } from "@novel/types";
import {
  splitContentBySensitive,
  SENSITIVE_LEVEL_META,
  type SensitiveHit,
} from "../data-model/sensitive-filter.js";

const { TextArea } = Input;

export interface ReviewItem {
  id: string;
  /** 章节标题 */
  title: string;
  /** 作者 */
  author: string;
  /** 章节正文预览（HTML 或纯文本） */
  content: string;
  /** 敏感词命中列表 */
  sensitiveWords?: { text: string; level: 1 | 2 | 3 }[];
  /**
   * 敏感词命中清单（含 offset，P8-1-5）。
   * 提供时正文将以纯文本形式渲染并内联高亮命中段；
   * 未提供时回退到 dangerouslySetInnerHTML 渲染 HTML。
   */
  sensitiveHits?: SensitiveHit[];
}

export interface ReviewHistoryEntry {
  /** 操作时间 */
  time: string;
  /** 操作人 */
  operator: string;
  /** 审核结果 */
  result: AuditResult;
  /** 审核意见 */
  comment?: string;
  /** 驳回原因分类 */
  rejectReason?: RejectReason;
}

export interface BContentReviewProps {
  /** 单条审核项（single 模式） */
  item?: ReviewItem;
  /** 批量审核项列表（batch 模式） */
  items?: ReviewItem[];
  /** 模式 */
  mode?: "single" | "batch";
  /** 审核历史 */
  history?: ReviewHistoryEntry[];
  /** 通过回调 */
  onApprove?: (ids: string[], comment: string) => void;
  /** 待修改回调 */
  onRevise?: (ids: string[], comment: string) => void;
  /** 驳回回调 */
  onReject?: (ids: string[], reason: RejectReason, comment: string) => void;
}

const REJECT_REASON_OPTIONS: { label: string; value: RejectReason }[] = [
  { label: "涉政", value: "political" },
  { label: "涉黄", value: "pornographic" },
  { label: "暴力", value: "violence" },
  { label: "抄袭", value: "plagiarism" },
  { label: "广告", value: "advertisement" },
  { label: "其他", value: "other" },
];

function getSensitiveColor(level: 1 | 2 | 3): string {
  switch (level) {
    case 1:
      return "var(--color-feedback-error)";
    case 2:
      return "var(--color-feedback-warning)";
    case 3:
    default:
      return "var(--color-text-tertiary)";
  }
}

/** 将 hits 去重为 {text, level} 词表（用于 Tag 清单） */
function dedupeHitsToWords(
  hits: SensitiveHit[],
): { text: string; level: 1 | 2 | 3 }[] {
  const seen = new Set<string>();
  const out: { text: string; level: 1 | 2 | 3 }[] = [];
  for (const h of hits) {
    const key = `${h.text}|${h.level}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text: h.text, level: h.level });
  }
  return out;
}

/**
 * P8-1-5 正文内敏感词高亮渲染。
 * - 提供 sensitiveHits 时：strip HTML → splitContentBySensitive → 命中段 <span> + Tooltip
 * - 否则回退 dangerouslySetInnerHTML
 */
function ContentPreview({
  content,
  hits,
}: {
  content: string;
  hits?: SensitiveHit[];
}) {
  const segments = useMemo(() => {
    if (!hits || hits.length === 0) return null;
    // 偏移基于纯文本，需先剥 HTML
    const plain = content.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
    return splitContentBySensitive(plain, hits);
  }, [content, hits]);

  if (!segments) {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  }

  return (
    <>
      {segments.map((seg, idx) =>
        seg.isHit && seg.hit ? (
          <Tooltip
            key={idx}
            title={`${SENSITIVE_LEVEL_META[seg.hit.level].label}：${seg.hit.suggestion ?? SENSITIVE_LEVEL_META[seg.hit.level].defaultSuggestion}`}
          >
            <span
              style={{
                background: SENSITIVE_LEVEL_META[seg.hit.level].bg,
                color: SENSITIVE_LEVEL_META[seg.hit.level].color,
                borderRadius: "var(--radius-xs, 2px)",
                padding: "0 2px",
                textDecoration: "underline wavy",
                textDecorationColor: SENSITIVE_LEVEL_META[seg.hit.level].color,
                cursor: "help",
              }}
            >
              {seg.text}
            </span>
          </Tooltip>
        ) : (
          <span key={idx}>{seg.text}</span>
        ),
      )}
    </>
  );
}

function getTimelineColor(result: AuditResult): string {
  switch (result) {
    case "approve":
      return "green";
    case "reject":
      return "red";
    case "revise":
      return "blue";
  }
}

function getResultLabel(result: AuditResult): string {
  switch (result) {
    case "approve":
      return "通过";
    case "reject":
      return "驳回";
    case "revise":
      return "待修改";
  }
}

/**
 * B 端内容审核流程组件
 * - 单条/批量模式
 * - 驳回必填原因分类 + 说明 ≥10 字
 * - 审核历史 Timeline
 */
export const BContentReview = forwardRef<HTMLDivElement, BContentReviewProps>(
  function BContentReview(
    {
      item,
      items = [],
      mode = "single",
      history = [],
      onApprove,
      onRevise,
      onReject,
    },
    ref,
  ) {
    const [comment, setComment] = useState("");
    const [rejectReason, setRejectReason] = useState<
      RejectReason | undefined
    >();
    const [submitting, setSubmitting] = useState(false);

    const currentItems = mode === "batch" ? items : item ? [item] : [];
    const currentIds = currentItems.map((i) => i.id);

    const validateReject = (): boolean => {
      if (!rejectReason) return false;
      return comment.trim().length >= 10;
    };

    const handleApprove = async () => {
      setSubmitting(true);
      try {
        await onApprove?.(currentIds, comment);
      } finally {
        setSubmitting(false);
      }
    };

    const handleRevise = async () => {
      setSubmitting(true);
      try {
        await onRevise?.(currentIds, comment);
      } finally {
        setSubmitting(false);
      }
    };

    const handleReject = async () => {
      if (!validateReject()) return;
      setSubmitting(true);
      try {
        await onReject?.(currentIds, rejectReason!, comment);
      } finally {
        setSubmitting(false);
      }
    };

    const canReject = validateReject();

    return (
      <div ref={ref} className="b-content-review">
        {/* 内容预览区 */}
        <Card
          title={`内容预览${mode === "batch" ? `（${currentItems.length} 条）` : ""}`}
          style={{ marginBottom: "var(--space-4)" }}
        >
          {currentItems.length === 0 ? (
            <Empty description="无待审内容" />
          ) : (
            currentItems.map((it) => {
              // P8-1-5：若提供 sensitiveHits 但未提供 sensitiveWords，则从 hits 派生 Tag 清单
              const tagWords =
                it.sensitiveWords && it.sensitiveWords.length > 0
                  ? it.sensitiveWords
                  : it.sensitiveHits && it.sensitiveHits.length > 0
                    ? dedupeHitsToWords(it.sensitiveHits)
                    : [];
              return (
                <div key={it.id} style={{ marginBottom: "var(--space-4)" }}>
                  <h3
                    style={{
                      fontSize: "var(--font-size-h3, 20px)",
                      fontWeight: 600,
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    {it.title}
                    <span
                      style={{
                        fontSize: "var(--font-size-body, 14px)",
                        color: "var(--color-text-secondary)",
                        marginLeft: "var(--space-2)",
                      }}
                    >
                      作者：{it.author}
                    </span>
                  </h3>
                  {tagWords.length > 0 && (
                    <div style={{ marginBottom: "var(--space-2)" }}>
                      <span
                        style={{
                          color: "var(--color-text-secondary)",
                          marginRight: "var(--space-2)",
                        }}
                      >
                        敏感词：
                      </span>
                      {tagWords.map((sw, idx) => (
                        <Tag
                          key={idx}
                          style={{
                            color: getSensitiveColor(sw.level),
                            borderColor: getSensitiveColor(sw.level),
                          }}
                        >
                          {sw.text}
                        </Tag>
                      ))}
                    </div>
                  )}
                  <div
                    className="b-content-review__content"
                    style={{
                      background: "var(--color-bg-subtle)",
                      borderRadius: "var(--radius-md, 8px)",
                      padding: "var(--space-4)",
                      maxHeight: 400,
                      overflowY: "auto",
                      lineHeight: 1.8,
                      fontSize: "var(--font-size-body, 14px)",
                    }}
                  >
                    <ContentPreview
                      content={it.content}
                      hits={it.sensitiveHits}
                    />
                  </div>
                </div>
              );
            })
          )}
        </Card>

        {/* 审核历史 */}
        {history.length > 0 && (
          <Card title="审核历史" style={{ marginBottom: "var(--space-4)" }}>
            <Timeline
              items={history.map((h) => ({
                color: getTimelineColor(h.result),
                children: (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                      }}
                    >
                      <Tag
                        color={
                          h.result === "approve"
                            ? "success"
                            : h.result === "reject"
                              ? "error"
                              : "processing"
                        }
                      >
                        {getResultLabel(h.result)}
                      </Tag>
                      <span
                        style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "var(--font-size-caption, 13px)",
                        }}
                      >
                        {h.operator} · {h.time}
                      </span>
                    </div>
                    {h.comment && (
                      <p
                        style={{
                          marginTop: "var(--space-1)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {h.comment}
                      </p>
                    )}
                  </div>
                ),
              }))}
            />
          </Card>
        )}

        {/* 审核操作栏 */}
        <Card title="审核操作">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <label
                style={{
                  color: "var(--color-text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                驳回原因：
              </label>
              <Select
                value={rejectReason}
                onChange={setRejectReason}
                options={REJECT_REASON_OPTIONS}
                placeholder="选择驳回原因（驳回时必填）"
                style={{ width: 200 }}
                allowClear
              />
            </div>
            <TextArea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="审核意见（驳回时需 ≥10 字）"
              rows={3}
              maxLength={500}
              showCount
            />
            <Space>
              <Button
                type="primary"
                loading={submitting}
                onClick={handleApprove}
                disabled={currentIds.length === 0}
              >
                通过
              </Button>
              <Button
                loading={submitting}
                onClick={handleRevise}
                disabled={currentIds.length === 0}
              >
                待修改
              </Button>
              <Button
                danger
                loading={submitting}
                onClick={handleReject}
                disabled={!canReject || currentIds.length === 0}
              >
                驳回
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  },
);
