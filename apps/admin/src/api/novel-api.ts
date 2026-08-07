/* ============================================================
 * B 端作品管理 API：对接后端 /api/v1/b/novels 真实接口
 * 响应统一 { code, message, data, traceId }，由 http 客户端解包
 * 数据模型对齐 @novel/types BNovelDetail
 * ============================================================ */

import { http, requestSafe } from "./http";
import type { BNovelDetail, BNovelStatus, OfflineReason } from "@novel/types";

/** 列表查询参数 */
export interface NovelListParams {
  page: number;
  pageSize: number;
  searchKey?: string;
  status?: BNovelStatus | "all";
  category?: string | "all";
  dateRange?: [number, number] | null;
}

/** 列表响应 */
export interface NovelListResponse {
  list: BNovelDetail[];
  total: number;
  page: number;
  pageSize: number;
}

/** 作品分类（与 menu-config 对齐） */
export const NOVEL_CATEGORIES = [
  { label: "全部", value: "all" },
  { label: "玄幻", value: "xuanhuan" },
  { label: "仙侠", value: "xianxia" },
  { label: "都市", value: "urban" },
  { label: "历史", value: "history" },
  { label: "科幻", value: "scifi" },
  { label: "武侠", value: "wuxia" },
  { label: "游戏", value: "game" },
  { label: "悬疑", value: "suspense" },
  { label: "言情", value: "romance" },
];

/** 分类 value → label 映射 */
export const CATEGORY_LABEL = Object.fromEntries(
  NOVEL_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<string, string>;

/** 状态选项 */
export const NOVEL_STATUS_OPTIONS = [
  { label: "全部", value: "all" as const },
  { label: "草稿", value: "draft" as const },
  { label: "待审核", value: "pending" as const },
  { label: "已发布", value: "published" as const },
  { label: "已下架", value: "offline" as const },
];

/** 后端返回的作品详情转前端共享结构（兼容 0→null、offlineReason→reason） */
type BackendNovel = Record<string, unknown>;

function mapNovel(raw: BackendNovel): BNovelDetail {
  const tags = Array.isArray(raw.tags) ? (raw.tags as string[]) : [];
  const offlineReason = (raw.offlineReason as string) || "";
  const offlineRemark = (raw.offlineRemark as string) || "";
  return {
    id: String(raw.id ?? ""),
    title: (raw.title as string) ?? "",
    author: (raw.author as string) ?? "",
    cover: (raw.cover as string) ?? "",
    category: (raw.category as string) ?? "",
    tags,
    wordCount: Number(raw.wordCount ?? 0),
    intro: (raw.intro as string) ?? "",
    lastUpdated: Number(raw.lastUpdated ?? raw.updatedAt ?? 0),
    status: (raw.status as BNovelStatus) ?? "draft",
    authorId: String(raw.authorId ?? ""),
    publishedAt: Number(raw.publishedAt ?? 0) || null,
    shelvedAt: Number(raw.shelvedAt ?? 0) || null,
    reason: offlineRemark || offlineReason || undefined,
    createdAt: Number(raw.createdAt ?? 0),
  };
}

/** 查询列表 */
export async function fetchNovelList(
  params: NovelListParams,
): Promise<NovelListResponse> {
  const data = await http.get<{
    items: BackendNovel[];
    total: number;
    page: number;
    pageSize: number;
  }>("/novels", {
    page: params.page,
    page_size: params.pageSize,
    search_key: params.searchKey ?? "",
    status: params.status ?? "all",
    category: params.category ?? "all",
    date_range: params.dateRange,
  });
  return {
    list: (data.items ?? []).map(mapNovel),
    total: data.total ?? 0,
    page: data.page ?? params.page,
    pageSize: data.pageSize ?? params.pageSize,
  };
}

/** 查询单条详情 */
export async function fetchNovelDetail(
  id: string,
): Promise<BNovelDetail | null> {
  try {
    const data = await http.get<BackendNovel>(`/novels/${id}`);
    return mapNovel(data);
  } catch {
    return null;
  }
}

/** 新建/编辑作品入参 */
export interface NovelFormValues {
  id?: string;
  title: string;
  author: string;
  category: string;
  tags: string[];
  intro: string;
  cover?: string;
  status: BNovelStatus;
  isOnShelf: boolean;
  price: number;
  vipChapters: string[];
}

/** 提交作品（新建/编辑） */
export async function submitNovel(
  values: NovelFormValues,
): Promise<{ success: boolean; id: string }> {
  const body = {
    title: values.title,
    authorId: values.author,
    category: values.category,
    cover: values.cover ?? "",
    intro: values.intro,
    flags: [],
    price: values.price ?? 0,
    authorRemark: "",
    isCompleted: values.status === "published" ? true : values.isOnShelf,
  };
  const result = await requestSafe(
    values.id
      ? http.put<BackendNovel>(`/novels/${values.id}`, body)
      : http.post<BackendNovel>("/novels", body),
  );
  if (result.success)
    return { success: true, id: String(result.data.id ?? values.id ?? "") };
  return { success: false, id: values.id ?? "" };
}

/** 批量操作（保留向后兼容，内部接入状态机校验） */
export async function batchOperate(
  ids: string[],
  action: "publish" | "offline" | "delete",
): Promise<{ success: boolean; failed?: { id: string; reason: string }[] }> {
  const target =
    action === "publish"
      ? "approve"
      : action === "offline"
        ? "shelve"
        : "delete";
  const data = await http.post<{
    success: boolean;
    failed?: { id: string; reason: string }[];
  }>("/novels/batch-operate", { ids: ids.map(Number), action: target });
  return {
    success: data.success,
    failed: (data.failed ?? []).map((f) => ({
      id: String(f.id),
      reason: f.reason,
    })),
  };
}

/* ---------- P8-3 · 上下架流程（状态机强校验 + 下架原因） ---------- */

/** 下架原因选项（P8-3-4） */
export const OFFLINE_REASON_OPTIONS: {
  label: string;
  value: OfflineReason;
  color: string;
}[] = [
  { label: "违规内容", value: "violation", color: "error" },
  { label: "版权问题", value: "copyright", color: "error" },
  { label: "作者请求", value: "author-request", color: "warning" },
  { label: "运营调整", value: "operation-adjust", color: "warning" },
];

/** 下架原因标签映射（P8-3-4 令牌） */
export const OFFLINE_REASON_LABEL: Record<
  OfflineReason,
  { text: string; color: string }
> = {
  violation: { text: "违规内容", color: "error" },
  copyright: { text: "版权问题", color: "error" },
  "author-request": { text: "作者请求", color: "warning" },
  "operation-adjust": { text: "运营调整", color: "warning" },
};

type OperateResult = {
  success: boolean;
  failed?: { id: string; reason: string }[];
};

function mapOperate(data: {
  success: boolean;
  failed?: { id: string; reason: string }[];
}): OperateResult {
  return {
    success: data.success,
    failed: (data.failed ?? []).map((f) => ({
      id: String(f.id),
      reason: f.reason,
    })),
  };
}

/** 提交审核：draft → pending（P8-3-1） */
export async function submitForAudit(ids: string[]): Promise<OperateResult> {
  const data = await http.post<{
    success: boolean;
    failed?: { id: string; reason: string }[];
  }>("/novels/submit-audit", { ids: ids.map(Number) });
  return mapOperate(data);
}

/** 审核通过上架：pending → published（P8-3-1） */
export async function approveNovel(ids: string[]): Promise<OperateResult> {
  const data = await http.post<{
    success: boolean;
    failed?: { id: string; reason: string }[];
  }>("/novels/approve", { ids: ids.map(Number) });
  return mapOperate(data);
}

/** 下架并记录原因：published → offline（P8-3-2） */
export async function shelveNovel(
  ids: string[],
  reason: OfflineReason,
  comment?: string,
): Promise<OperateResult> {
  const data = await http.post<{
    success: boolean;
    failed?: { id: string; reason: string }[];
  }>("/novels/shelve", {
    ids: ids.map(Number),
    reason,
    comment: comment ?? "",
  });
  return mapOperate(data);
}

/** 恢复上架：offline → published（P8-3-2） */
export async function reshelveNovel(ids: string[]): Promise<OperateResult> {
  const data = await http.post<{
    success: boolean;
    failed?: { id: string; reason: string }[];
  }>("/novels/reshelve", { ids: ids.map(Number) });
  return mapOperate(data);
}
