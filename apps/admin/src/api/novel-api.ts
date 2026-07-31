/* ============================================================
 * P4-0 · 作品相关 Mock API（P5/P6 接真实 API 后替换）
 * 数据模型对齐 @novel/types BNovelDetail
 * ============================================================ */

import type { BNovelDetail, BNovelStatus } from '@novel/types';

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

/** 批量操作 */
export async function batchOperate(ids: string[], action: 'publish' | 'offline' | 'delete'): Promise<{ success: boolean }> {
  await delay(400);
  if (action === 'delete') {
    ids.forEach((id) => {
      const idx = MOCK_NOVELS.findIndex((n) => n.id === id);
      if (idx >= 0) MOCK_NOVELS.splice(idx, 1);
    });
  } else {
    ids.forEach((id) => {
      const novel = MOCK_NOVELS.find((n) => n.id === id);
      if (novel) {
        novel.status = action === 'publish' ? 'published' : 'offline';
        novel.lastUpdated = Date.now();
      }
    });
  }
  return { success: true };
}
