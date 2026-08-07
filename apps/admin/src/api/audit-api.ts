/* ============================================================
 * B 端内容审核 API：对接后端 /api/v1/b/audits 真实接口
 * 响应统一 { code, message, data, traceId }，由 http 客户端解包
 * 待审队列 + 敏感词清单 + 审核历史 + 提交审核结果
 * Source: 04 §5.6 / P5-2
 * ============================================================ */

import { http } from "./http";
import type { AuditLevel, AuditResult, RejectReason } from "@novel/types";

/** 敏感词等级 */
export type SensitiveLevel = 1 | 2 | 3;

/** 敏感词命中 */
export interface SensitiveHit {
  /** 命中文字 */
  text: string;
  /** 等级：1=高危（涉政/涉黄） 2=中等（暴力） 3=轻微（广告） */
  level: SensitiveLevel;
  /** 在正文中的起始偏移 */
  offset: number;
  /** 处理建议 */
  suggestion: string;
}

/** 待审条目 */
export interface AuditItem {
  id: string;
  /** 章节标题 */
  chapterTitle: string;
  /** 章节所属作品 */
  novelTitle: string;
  /** 作者 */
  author: string;
  /** 审核级别 */
  level: AuditLevel;
  /** 提交时间戳 */
  submittedAt: number;
  /** 章节正文（含敏感词） */
  content: string;
  /** 命中的敏感词清单 */
  sensitiveHits: SensitiveHit[];
  /** 字数 */
  wordCount: number;
}

/** 审核历史条目 */
export interface AuditHistoryEntry {
  id: string;
  time: string;
  operator: string;
  result: AuditResult;
  comment?: string;
  rejectReason?: RejectReason;
}

/** 审核提交入参 */
export interface AuditSubmitParams {
  ids: string[];
  result: AuditResult;
  comment: string;
  rejectReason?: RejectReason;
}

/** 审核队列统计 */
export interface AuditQueueStats {
  /** 待审总数 */
  pendingCount: number;
  /** 今日已处理 */
  todayProcessed: number;
  /** 按级别分组 */
  byLevel: Record<AuditLevel, number>;
}

/** 后端审核队列条目 */
interface BackendAuditItem {
  id: string;
  targetType?: string;
  targetId?: string;
  level: AuditLevel;
  status?: string;
  targetTitle?: string;
  chapterTitle?: string;
  novelTitle?: string;
  author?: string;
  content?: string;
  wordCount?: number;
  sensitiveHits?: SensitiveHit[];
  submittedAt?: number;
  processedAt?: number;
}

interface BackendAuditQueue {
  list: BackendAuditItem[];
  stats: AuditQueueStats;
}

interface BackendHistoryItem {
  id: string;
  operatorName: string;
  result: string;
  comment: string;
  rejectReason: string;
  createdAt: number;
}

/** 审核级别选项 */
export const AUDIT_LEVEL_OPTIONS: {
  label: string;
  value: AuditLevel | "all";
}[] = [
  { label: "全部", value: "all" },
  { label: "初审", value: "first" },
  { label: "复审", value: "second" },
  { label: "终审", value: "final" },
];

/** 审核级别标签 */
export const AUDIT_LEVEL_LABEL: Record<
  AuditLevel,
  { text: string; color: string }
> = {
  first: { text: "初审", color: "processing" },
  second: { text: "复审", color: "warning" },
  final: { text: "终审", color: "error" },
};

/** 敏感词等级配色与说明 */
export const SENSITIVE_LEVEL_CONFIG: Record<
  SensitiveLevel,
  { color: string; bg: string; label: string; suggestion: string }
> = {
  1: {
    color: "var(--color-feedback-error)",
    bg: "var(--color-feedback-error-bg)",
    label: "高危",
    suggestion: "建议立即驳回并要求作者重写",
  },
  2: {
    color: "var(--color-feedback-warning)",
    bg: "var(--color-feedback-warning-bg)",
    label: "中等",
    suggestion: "建议作者修改后重新提交",
  },
  3: {
    color: "var(--color-text-tertiary)",
    bg: "var(--color-bg-subtle)",
    label: "轻微",
    suggestion: "可人工判断是否通过",
  },
};

/** 驳回原因选项 */
export const REJECT_REASON_OPTIONS: { label: string; value: RejectReason }[] = [
  { label: "涉政", value: "political" },
  { label: "涉黄", value: "pornographic" },
  { label: "暴力", value: "violence" },
  { label: "抄袭", value: "plagiarism" },
  { label: "广告", value: "advertisement" },
  { label: "其他", value: "other" },
];

function mapItem(raw: BackendAuditItem): AuditItem {
  return {
    id: String(raw.id ?? ""),
    chapterTitle: raw.chapterTitle || raw.targetTitle || "",
    novelTitle: raw.novelTitle || "",
    author: raw.author || "",
    level: raw.level ?? "first",
    submittedAt: Number(raw.submittedAt ?? 0),
    content: raw.content ?? "",
    sensitiveHits: raw.sensitiveHits ?? [],
    wordCount: Number(raw.wordCount ?? 0),
  };
}

/** 拉取待审队列 */
export async function fetchAuditQueue(
  level: AuditLevel | "all" = "all",
): Promise<{
  list: AuditItem[];
  stats: AuditQueueStats;
}> {
  const data = await http.get<BackendAuditQueue>("/audits/queue", { level });
  return {
    list: (data.list ?? []).map(mapItem),
    stats: data.stats ?? {
      pendingCount: 0,
      todayProcessed: 0,
      byLevel: { first: 0, second: 0, final: 0 },
    },
  };
}

/** 拉取审核历史 */
export async function fetchAuditHistory(
  itemId: string,
): Promise<AuditHistoryEntry[]> {
  const data = await http.get<BackendHistoryItem[]>(
    `/audits/${itemId}/history`,
  );
  return (data ?? []).map((h) => ({
    id: String(h.id),
    time: h.createdAt ? new Date(h.createdAt).toLocaleString("zh-CN") : "",
    operator: h.operatorName,
    result: h.result as AuditResult,
    comment: h.comment || undefined,
    rejectReason: (h.rejectReason as RejectReason) || undefined,
  }));
}

/** 拉取审核项正文（按需加载，避免队列全量载入） */
export async function fetchAuditContent(itemId: string): Promise<string> {
  const data = await http.get<{ content: string }>(`/audits/${itemId}/content`);
  return data?.content ?? "";
}

/** 提交审核结果 */
export async function submitAudit(
  params: AuditSubmitParams,
): Promise<{ success: boolean; nextId?: string }> {
  const data = await http.post<{
    success: boolean;
    nextId?: string | null;
    failed?: { id: string; reason: string }[];
  }>("/audits/submit", {
    ids: params.ids,
    result: params.result,
    comment: params.comment,
    rejectReason: params.rejectReason ?? null,
  });
  return { success: data.success, nextId: data.nextId ?? undefined };
}

/**
 * 将正文按敏感词命中拆分为高亮片段
 * @returns [{ text, isHit, hit? }] 数组
 */
export interface ContentSegment {
  text: string;
  isHit: boolean;
  hit?: SensitiveHit;
}

export function splitContentBySensitive(
  content: string,
  hits: SensitiveHit[],
): ContentSegment[] {
  if (hits.length === 0) return [{ text: content, isHit: false }];
  const sorted = [...hits].sort((a, b) => a.offset - b.offset);
  const segments: ContentSegment[] = [];
  let cursor = 0;
  for (const hit of sorted) {
    if (hit.offset > cursor) {
      segments.push({ text: content.slice(cursor, hit.offset), isHit: false });
    }
    segments.push({
      text: content.slice(hit.offset, hit.offset + hit.text.length),
      isHit: true,
      hit,
    });
    cursor = hit.offset + hit.text.length;
  }
  if (cursor < content.length) {
    segments.push({ text: content.slice(cursor), isHit: false });
  }
  return segments;
}
