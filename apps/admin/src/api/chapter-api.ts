/* ============================================================
 * B 端章节管理 API：对接后端 /api/v1/b 真实接口
 * 响应统一 { code, message, data, traceId }，由 http 客户端解包
 * 数据模型对齐 @novel/types BChapterDetail
 * 状态流转：draft → pending → published → offline → published
 * Source: 04 §5.5 / P5-1
 * ============================================================ */

import { http, requestSafe } from "./http";
import type { BChapterDetail, BChapterStatus } from "@novel/types";

/** 章节列表查询参数 */
export interface ChapterListParams {
  novelId: string;
  page: number;
  pageSize: number;
  searchKey?: string;
  status?: BChapterStatus | "all";
  sortBy?: "index" | "updatedAt";
}

/** 章节列表响应 */
export interface ChapterListResponse {
  list: BChapterDetail[];
  total: number;
  page: number;
  pageSize: number;
  /** 作品总字数 */
  totalWords: number;
  /** 作品状态 */
  novelStatus: string;
}

/** 章节状态选项 */
export const CHAPTER_STATUS_OPTIONS = [
  { label: "全部", value: "all" as const },
  { label: "草稿", value: "draft" as const },
  { label: "待审核", value: "pending" as const },
  { label: "已发布", value: "published" as const },
  { label: "已下架", value: "offline" as const },
];

/** 状态 Tag 配色 */
export const CHAPTER_STATUS_TAG: Record<
  BChapterStatus,
  { color: string; text: string }
> = {
  draft: { color: "default", text: "草稿" },
  pending: { color: "processing", text: "待审核" },
  published: { color: "success", text: "已发布" },
  offline: { color: "error", text: "已下架" },
};

/** 后端章节项（novelId → bookId） */
interface BackendChapter {
  id: string;
  novelId: string;
  index: number;
  title: string;
  wordCount: number;
  pureWordCount: number;
  punctuationWordCount: number;
  status: BChapterStatus;
  auditLevel?: string;
  isVip: boolean;
  publishedAt: number;
  createdAt: number;
  updatedAt: number;
  content?: string;
}

function mapChapter(raw: BackendChapter): BChapterDetail {
  return {
    id: String(raw.id ?? ""),
    bookId: String(raw.novelId ?? ""),
    index: Number(raw.index ?? 0),
    title: raw.title ?? "",
    wordCount: Number(raw.wordCount ?? 0),
    isVip: Boolean(raw.isVip),
    publishedAt: Number(raw.publishedAt ?? 0) || 0,
    status: raw.status ?? "draft",
    content: raw.content ?? "",
    pureWordCount: Number(raw.pureWordCount ?? 0),
    punctuationWordCount: Number(raw.punctuationWordCount ?? 0),
    createdAt: Number(raw.createdAt ?? 0),
    updatedAt: Number(raw.updatedAt ?? 0),
  };
}

/** 查询章节列表（服务端分页/搜索/排序） */
export async function fetchChapterList(
  params: ChapterListParams,
): Promise<ChapterListResponse> {
  const data = await http.get<{
    list: BackendChapter[];
    total: number;
    page: number;
    pageSize: number;
    totalWords: number;
    novelStatus: string;
  }>(`/novels/${params.novelId}/chapters`, {
    page: params.page,
    page_size: params.pageSize,
    search_key: params.searchKey ?? "",
    status: params.status ?? "all",
    sort_by: params.sortBy ?? "index",
  });
  const list = (data.list ?? []).map(mapChapter);
  return {
    list,
    total: data.total ?? 0,
    page: data.page ?? params.page,
    pageSize: data.pageSize ?? params.pageSize,
    totalWords: data.totalWords ?? 0,
    novelStatus: data.novelStatus ?? "published",
  };
}

/** 查询单条章节详情 */
export async function fetchChapterDetail(
  id: string,
): Promise<BChapterDetail | null> {
  try {
    const data = await http.get<BackendChapter>(`/chapters/${id}`);
    return mapChapter(data);
  } catch {
    return null;
  }
}

/** 章节列表入参（新建/编辑） */
export interface ChapterFormValues {
  id?: string;
  bookId: string;
  title: string;
  content: string;
  isVip: boolean;
  status?: BChapterStatus;
}

/** 新建章节 */
export async function createChapter(
  values: ChapterFormValues,
): Promise<{ success: boolean; id: string }> {
  const result = await requestSafe(
    http.post<BackendChapter>("/chapters", {
      novelId: values.bookId,
      title: values.title,
      content: values.content,
      isVip: values.isVip,
      auditLevel: "first",
    }),
  );
  if (result.success) return { success: true, id: String(result.data.id) };
  return { success: false, id: "" };
}

/** 更新章节（含行内标题编辑） */
export async function updateChapter(
  id: string,
  patch: Partial<Pick<BChapterDetail, "title" | "content" | "isVip">>,
): Promise<{ success: boolean }> {
  const result = await requestSafe(
    http.patch(`/chapters/${id}`, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.isVip !== undefined ? { isVip: patch.isVip } : {}),
    }),
  );
  if (result.success) return { success: true };
  return { success: false };
}

/** 拖拽排序：批量更新 index（同页内重排） */
export async function reorderChapters(
  novelId: string,
  orderedIds: string[],
): Promise<{ success: boolean }> {
  const result = await requestSafe(
    http.post(`/novels/${novelId}/chapters/reorder`, {
      orderedIds: orderedIds.map(Number),
    }),
  );
  if (result.success) return { success: true };
  return { success: false };
}

/** 章节状态流转（含合法性校验） */
export async function transitionChapterStatus(
  id: string,
  to: BChapterStatus,
): Promise<{ success: boolean; reason?: string }> {
  const result = await requestSafe(
    http.post(`/chapters/${id}/transition`, { target: to }),
  );
  if (result.success) return { success: true };
  return { success: false, reason: result.error ?? "章节状态转换失败" };
}

/** 批量操作 */
export async function batchOperateChapters(
  ids: string[],
  action: "publish" | "offline" | "delete" | "submit-audit",
): Promise<{ success: boolean; failed?: string[] }> {
  const numericIds = ids.map(Number);

  try {
    const data = await http.post<{
      success: boolean;
      failed?: { id: string; reason: string }[];
    }>("/chapters/batch-operate", {
      ids: numericIds,
      action: action === "submit-audit" ? "submit" : action,
    });
    if (!data.success && data.failed) {
      return { success: false, failed: data.failed.map((f) => String(f.id)) };
    }
    return { success: true };
  } catch {
    return { success: false, failed: ids };
  }
}

/** 删除章节（已发布需标题匹配，前端校验后调用） */
export async function deleteChapter(
  id: string,
  titleMatch?: string,
): Promise<{ success: boolean; reason?: string }> {
  const result = await requestSafe(
    http.del(`/chapters/${id}`, titleMatch ? { titleMatch } : {}),
  );
  if (result.success) return { success: true };
  return { success: false, reason: result.error ?? "章节删除失败" };
}
