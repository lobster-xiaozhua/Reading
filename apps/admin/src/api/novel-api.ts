/* ============================================================
 * P4-0 · 作品相关 Mock API（P5/P6 接真实 API 后替换）
 * 数据模型对齐 @novel/types BNovelDetail
 * ============================================================ */

import type { BNovelDetail, BNovelStatus, OfflineReason } from '@novel/types';
import { canTransitionNovel } from '@novel/b-end';

/** 列表查询参数 */
export interface NovelListParams {
  page: number;
  pageSize: number;
  searchKey?: string;
  status?: BNovelStatus | 'all';
  category?: string | 'all';
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
  { label: '全部', value: 'all' },
  { label: '玄幻', value: 'xuanhuan' },
  { label: '仙侠', value: 'xianxia' },
  { label: '都市', value: 'urban' },
  { label: '历史', value: 'history' },
  { label: '科幻', value: 'scifi' },
  { label: '武侠', value: 'wuxia' },
  { label: '游戏', value: 'game' },
  { label: '悬疑', value: 'suspense' },
  { label: '言情', value: 'romance' },
];

/** 状态选项 */
export const NOVEL_STATUS_OPTIONS = [
  { label: '全部', value: 'all' as const },
  { label: '草稿', value: 'draft' as const },
  { label: '待审核', value: 'pending' as const },
  { label: '已发布', value: 'published' as const },
  { label: '已下架', value: 'offline' as const },
];

/** Mock 数据生成 */
const MOCK_NOVELS: BNovelDetail[] = Array.from({ length: 47 }).map((_, i) => {
  const statuses: BNovelStatus[] = ['draft', 'pending', 'published', 'offline'];
  const cats = ['xuanhuan', 'xianxia', 'urban', 'history', 'scifi', 'wuxia', 'game', 'suspense', 'romance'];
  const status = statuses[i % 4];
  const now = Date.now();
  return {
    id: `novel-${String(i + 1).padStart(4, '0')}`,
    title: `测试作品 ${i + 1}`,
    author: `作者${String.fromCharCode(65 + (i % 26))}`,
    cover: '',
    category: cats[i % cats.length],
    tags: ['VIP', '推荐'].slice(0, (i % 3) + 1),
    wordCount: 100000 + i * 5000,
    intro: `这是测试作品 ${i + 1} 的简介内容。`,
    lastUpdated: now - i * 86400000,
    status,
    authorId: `author-${i % 10}`,
    publishedAt: status === 'published' ? now - i * 86400000 * 2 : null,
    shelvedAt: status === 'offline' ? now - i * 86400000 : null,
    createdAt: now - i * 86400000 * 3,
  };
});

/** 模拟网络延迟 */
function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** 查询列表 */
export async function fetchNovelList(params: NovelListParams): Promise<NovelListResponse> {
  await delay(300);
  let list = [...MOCK_NOVELS];

  if (params.searchKey) {
    const q = params.searchKey.toLowerCase();
    list = list.filter(
      (n) => n.title.toLowerCase().includes(q) || n.author.toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== 'all') {
    list = list.filter((n) => n.status === params.status);
  }
  if (params.category && params.category !== 'all') {
    list = list.filter((n) => n.category === params.category);
  }
  if (params.dateRange && params.dateRange.length === 2) {
    const [start, end] = params.dateRange;
    list = list.filter((n) => n.lastUpdated >= start && n.lastUpdated <= end);
  }

  const total = list.length;
  const start = (params.page - 1) * params.pageSize;
  const paged = list.slice(start, start + params.pageSize);

  return { list: paged, total, page: params.page, pageSize: params.pageSize };
}

/** 查询单条详情 */
export async function fetchNovelDetail(id: string): Promise<BNovelDetail | null> {
  await delay(300);
  return MOCK_NOVELS.find((n) => n.id === id) ?? null;
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
export async function submitNovel(values: NovelFormValues): Promise<{ success: boolean; id: string }> {
  await delay(500);
  if (values.id) {
    const idx = MOCK_NOVELS.findIndex((n) => n.id === values.id);
    if (idx >= 0) {
      MOCK_NOVELS[idx] = { ...MOCK_NOVELS[idx], ...values, lastUpdated: Date.now() };
    }
  } else {
    MOCK_NOVELS.unshift({
      id: `novel-${String(MOCK_NOVELS.length + 1).padStart(4, '0')}`,
      title: values.title,
      author: values.author,
      cover: values.cover ?? '',
      category: values.category,
      tags: values.tags,
      wordCount: 0,
      intro: values.intro,
      lastUpdated: Date.now(),
      status: values.status,
      authorId: 'author-0',
      publishedAt: values.isOnShelf ? Date.now() : null,
      shelvedAt: null,
      createdAt: Date.now(),
    });
  }
  return { success: true, id: values.id ?? `novel-${String(MOCK_NOVELS.length).padStart(4, '0')}` };
}

/** 批量操作（保留向后兼容，内部接入状态机校验） */
export async function batchOperate(ids: string[], action: 'publish' | 'offline' | 'delete'): Promise<{ success: boolean; failed?: { id: string; reason: string }[] }> {
  await delay(400);
  if (action === 'delete') {
    ids.forEach((id) => {
      const idx = MOCK_NOVELS.findIndex((n) => n.id === id);
      if (idx >= 0) MOCK_NOVELS.splice(idx, 1);
    });
    return { success: true };
  }
  // publish/offline 接入状态机校验（P8-3）
  const targetStatus: BNovelStatus = action === 'publish' ? 'published' : 'offline';
  const failed: { id: string; reason: string }[] = [];
  ids.forEach((id) => {
    const novel = MOCK_NOVELS.find((n) => n.id === id);
    if (!novel) {
      failed.push({ id, reason: '作品不存在' });
      return;
    }
    if (!canTransitionNovel(novel.status, targetStatus)) {
      failed.push({ id, reason: `当前状态「${novel.status}」不可转换到「${targetStatus}」` });
      return;
    }
    novel.status = targetStatus;
    novel.lastUpdated = Date.now();
    if (targetStatus === 'published') {
      novel.publishedAt = novel.publishedAt ?? Date.now();
      novel.shelvedAt = null;
      novel.reason = undefined;
    } else {
      novel.shelvedAt = Date.now();
    }
  });
  return { success: failed.length === 0, failed: failed.length > 0 ? failed : undefined };
}

/* ---------- P8-3 · 上下架流程（状态机强校验 + 下架原因） ---------- */

/** 下架原因选项（P8-3-4） */
export const OFFLINE_REASON_OPTIONS: { label: string; value: OfflineReason; color: string }[] = [
  { label: '违规内容', value: 'violation', color: 'error' },
  { label: '版权问题', value: 'copyright', color: 'error' },
  { label: '作者请求', value: 'author-request', color: 'warning' },
  { label: '运营调整', value: 'operation-adjust', color: 'warning' },
];

/** 下架原因标签映射（P8-3-4 令牌） */
export const OFFLINE_REASON_LABEL: Record<OfflineReason, { text: string; color: string }> = {
  violation: { text: '违规内容', color: 'error' },
  copyright: { text: '版权问题', color: 'error' },
  'author-request': { text: '作者请求', color: 'warning' },
  'operation-adjust': { text: '运营调整', color: 'warning' },
};

/** 提交审核：draft → pending（P8-3-1） */
export async function submitForAudit(ids: string[]): Promise<{ success: boolean; failed?: { id: string; reason: string }[] }> {
  await delay(400);
  const failed: { id: string; reason: string }[] = [];
  ids.forEach((id) => {
    const novel = MOCK_NOVELS.find((n) => n.id === id);
    if (!novel) {
      failed.push({ id, reason: '作品不存在' });
      return;
    }
    if (!canTransitionNovel(novel.status, 'pending')) {
      failed.push({ id, reason: `当前状态「${novel.status}」不可提交审核（仅草稿可提交）` });
      return;
    }
    novel.status = 'pending';
    novel.lastUpdated = Date.now();
  });
  return { success: failed.length === 0, failed: failed.length > 0 ? failed : undefined };
}

/** 审核通过上架：pending → published（P8-3-1） */
export async function approveNovel(ids: string[]): Promise<{ success: boolean; failed?: { id: string; reason: string }[] }> {
  await delay(400);
  const failed: { id: string; reason: string }[] = [];
  ids.forEach((id) => {
    const novel = MOCK_NOVELS.find((n) => n.id === id);
    if (!novel) {
      failed.push({ id, reason: '作品不存在' });
      return;
    }
    if (!canTransitionNovel(novel.status, 'published')) {
      failed.push({ id, reason: `当前状态「${novel.status}」不可上架（仅待审核可上架）` });
      return;
    }
    novel.status = 'published';
    novel.publishedAt = novel.publishedAt ?? Date.now();
    novel.shelvedAt = null;
    novel.reason = undefined;
    novel.lastUpdated = Date.now();
  });
  return { success: failed.length === 0, failed: failed.length > 0 ? failed : undefined };
}

/** 下架并记录原因：published → offline（P8-3-2） */
export async function shelveNovel(
  ids: string[],
  reason: OfflineReason,
  comment?: string,
): Promise<{ success: boolean; failed?: { id: string; reason: string }[] }> {
  await delay(400);
  const failed: { id: string; reason: string }[] = [];
  const reasonLabel = OFFLINE_REASON_LABEL[reason].text;
  ids.forEach((id) => {
    const novel = MOCK_NOVELS.find((n) => n.id === id);
    if (!novel) {
      failed.push({ id, reason: '作品不存在' });
      return;
    }
    if (!canTransitionNovel(novel.status, 'offline')) {
      failed.push({ id, reason: `当前状态「${novel.status}」不可下架` });
      return;
    }
    novel.status = 'offline';
    novel.shelvedAt = Date.now();
    novel.reason = comment ? `${reasonLabel}：${comment}` : reasonLabel;
    novel.lastUpdated = Date.now();
  });
  return { success: failed.length === 0, failed: failed.length > 0 ? failed : undefined };
}

/** 恢复上架：offline → published（P8-3-2） */
export async function reshelveNovel(ids: string[]): Promise<{ success: boolean; failed?: { id: string; reason: string }[] }> {
  await delay(400);
  const failed: { id: string; reason: string }[] = [];
  ids.forEach((id) => {
    const novel = MOCK_NOVELS.find((n) => n.id === id);
    if (!novel) {
      failed.push({ id, reason: '作品不存在' });
      return;
    }
    if (!canTransitionNovel(novel.status, 'published')) {
      failed.push({ id, reason: `当前状态「${novel.status}」不可恢复上架` });
      return;
    }
    novel.status = 'published';
    novel.shelvedAt = null;
    novel.reason = undefined;
    novel.lastUpdated = Date.now();
  });
  return { success: failed.length === 0, failed: failed.length > 0 ? failed : undefined };
}
