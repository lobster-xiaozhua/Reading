/* ============================================================
 * P5-1 · 章节相关 Mock API（P6/P8 接真实 API 后替换）
 * 数据模型对齐 @novel/types BChapterDetail
 * 状态流转：draft → pending → published → offline → published
 * Source: 04 §5.5 / P5-1
 * ============================================================ */

import type { BChapterDetail, BChapterStatus } from '@novel/types';
import { canTransitionChapter } from '@novel/b-end';

/** 章节列表查询参数 */
export interface ChapterListParams {
  novelId: string;
  page: number;
  pageSize: number;
  searchKey?: string;
  status?: BChapterStatus | 'all';
  sortBy?: 'index' | 'updatedAt';
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
  { label: '全部', value: 'all' as const },
  { label: '草稿', value: 'draft' as const },
  { label: '待审核', value: 'pending' as const },
  { label: '已发布', value: 'published' as const },
  { label: '已下架', value: 'offline' as const },
];

/** 状态 Tag 配色 */
export const CHAPTER_STATUS_TAG: Record<BChapterStatus, { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  pending: { color: 'processing', text: '待审核' },
  published: { color: 'success', text: '已发布' },
  offline: { color: 'error', text: '已下架' },
};

/** 章节正文片段池（用于生成 mock 正文） */
const CHAPTER_FRAGMENTS = [
  '夜色如墨，少年独自立于山巅，望着远方那道冲天剑光，眼中闪过一丝决然。',
  '突破的契机就在这一瞬，他强忍着经脉中的剧痛，引导着体内灵力缓缓汇聚。',
  '"你究竟是谁？"对面的老者声音颤抖，仿佛看见了什么不可思议的存在。',
  '剑光一闪，长街尽头那道身影轰然倒地，鲜血染红了青石板路。',
  '丹田之中，那枚沉寂已久的金丹终于开始缓缓转动，散发出璀璨光芒。',
  '城外百里，荒兽咆哮，少年握紧手中长刀，他知道这一战避无可避。',
  '师父临终前的话再次回响在耳畔：道之一途，唯心所向，万法归一。',
  '阵法启动的瞬间，整座大殿被七彩霞光笼罩，仿佛置身仙境。',
  '她轻轻一笑，那容颜如春花绽放，让整个江湖都为之失色。',
  '历史的真相往往埋藏在最不起眼的角落，等待有缘人发掘。',
];

/** 生成 mock 章节列表（按 novelId 缓存，保持一致性） */
const CHAPTER_CACHE = new Map<string, BChapterDetail[]>();

function ensureChapters(novelId: string): BChapterDetail[] {
  const cached = CHAPTER_CACHE.get(novelId);
  if (cached) return cached;

  // 每本书生成 60 章（mock 量级，足以验证分页与拖拽）
  const count = 60;
  const now = Date.now();
  const statuses: BChapterStatus[] = ['draft', 'pending', 'published', 'published', 'published'];
  const list: BChapterDetail[] = Array.from({ length: count }).map((_, i) => {
    const status = statuses[i % 5];
    const wordCount = 2000 + Math.floor(Math.random() * 3000);
    const content = Array.from({ length: 8 })
      .map(() => CHAPTER_FRAGMENTS[i % CHAPTER_FRAGMENTS.length])
      .join('');
    return {
      id: `${novelId}-ch-${String(i + 1).padStart(4, '0')}`,
      bookId: novelId,
      index: i + 1,
      title: `第 ${i + 1} 章 ${['初入江湖', '锋芒初露', '暗流涌动', '风云再起', '决战之巅', '归隐山林', '重返巅峰', '大道无形'][i % 8]}`,
      wordCount,
      isVip: i >= 20 && i % 3 === 0,
      publishedAt: status === 'published' ? now - i * 3600000 : 0,
      status,
      content,
      pureWordCount: wordCount - 50,
      punctuationWordCount: wordCount,
      createdAt: now - (count - i) * 86400000,
      updatedAt: now - i * 3600000,
    };
  });
  CHAPTER_CACHE.set(novelId, list);
  return list;
}

/** 模拟网络延迟 */
function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** 查询章节列表 */
export async function fetchChapterList(params: ChapterListParams): Promise<ChapterListResponse> {
  await delay(300);
  let list = [...ensureChapters(params.novelId)];

  if (params.searchKey) {
    const q = params.searchKey.toLowerCase();
    list = list.filter((c) => c.title.toLowerCase().includes(q));
  }
  if (params.status && params.status !== 'all') {
    list = list.filter((c) => c.status === params.status);
  }

  if (params.sortBy === 'updatedAt') {
    list.sort((a, b) => b.updatedAt - a.updatedAt);
  } else {
    list.sort((a, b) => a.index - b.index);
  }

  const totalWords = list.reduce((sum, c) => sum + c.wordCount, 0);
  const total = list.length;
  const start = (params.page - 1) * params.pageSize;
  const paged = list.slice(start, start + params.pageSize);

  return {
    list: paged,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalWords,
    novelStatus: 'published',
  };
}

/** 查询单条章节详情 */
export async function fetchChapterDetail(id: string): Promise<BChapterDetail | null> {
  await delay(200);
  for (const list of CHAPTER_CACHE.values()) {
    const found = list.find((c) => c.id === id);
    if (found) return { ...found };
  }
  return null;
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
export async function createChapter(values: ChapterFormValues): Promise<{ success: boolean; id: string }> {
  await delay(400);
  const list = ensureChapters(values.bookId);
  const newIndex = list.length + 1;
  const now = Date.now();
  const wordCount = values.content.length;
  const chapter: BChapterDetail = {
    id: `${values.bookId}-ch-${String(newIndex).padStart(4, '0')}`,
    bookId: values.bookId,
    index: newIndex,
    title: values.title,
    wordCount,
    isVip: values.isVip,
    publishedAt: 0,
    status: values.status ?? 'draft',
    content: values.content,
    pureWordCount: wordCount - 20,
    punctuationWordCount: wordCount,
    createdAt: now,
    updatedAt: now,
  };
  list.push(chapter);
  return { success: true, id: chapter.id };
}

/** 更新章节（含行内标题编辑） */
export async function updateChapter(
  id: string,
  patch: Partial<Pick<BChapterDetail, 'title' | 'content' | 'isVip'>>,
): Promise<{ success: boolean }> {
  await delay(300);
  for (const list of CHAPTER_CACHE.values()) {
    const idx = list.findIndex((c) => c.id === id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        ...patch,
        wordCount: patch.content ? patch.content.length : list[idx].wordCount,
        updatedAt: Date.now(),
      };
      return { success: true };
    }
  }
  return { success: false };
}

/** 拖拽排序：批量更新 index（同页内重排） */
export async function reorderChapters(
  novelId: string,
  orderedIds: string[],
): Promise<{ success: boolean }> {
  await delay(200);
  const list = ensureChapters(novelId);
  // 按拖拽后的顺序重建 index
  const idToNewIndex = new Map<string, number>();
  orderedIds.forEach((id, i) => idToNewIndex.set(id, i + 1));
  list.forEach((c) => {
    if (idToNewIndex.has(c.id)) {
      c.index = idToNewIndex.get(c.id)!;
      c.updatedAt = Date.now();
    }
  });
  // 重新排序缓存
  list.sort((a, b) => a.index - b.index);
  return { success: true };
}

/** 章节状态流转（含合法性校验） */
export async function transitionChapterStatus(
  id: string,
  to: BChapterStatus,
): Promise<{ success: boolean; reason?: string }> {
  await delay(300);
  for (const list of CHAPTER_CACHE.values()) {
    const chapter = list.find((c) => c.id === id);
    if (chapter) {
      if (!canTransitionChapter(chapter.status, to)) {
        return {
          success: false,
          reason: `非法状态转换：${chapter.status} → ${to}`,
        };
      }
      chapter.status = to;
      chapter.updatedAt = Date.now();
      if (to === 'published') chapter.publishedAt = Date.now();
      return { success: true };
    }
  }
  return { success: false, reason: '章节不存在' };
}

/** 批量操作 */
export async function batchOperateChapters(
  ids: string[],
  action: 'publish' | 'offline' | 'delete' | 'submit-audit',
): Promise<{ success: boolean; failed?: string[] }> {
  await delay(400);
  const failed: string[] = [];
  ids.forEach((id) => {
    let found = false;
    for (const list of CHAPTER_CACHE.values()) {
      const idx = list.findIndex((c) => c.id === id);
      if (idx >= 0) {
        found = true;
        const chapter = list[idx];
        if (action === 'delete') {
          list.splice(idx, 1);
        } else {
          const target: BChapterStatus =
            action === 'publish' ? 'published' :
            action === 'offline' ? 'offline' :
            'pending';
          if (canTransitionChapter(chapter.status, target)) {
            chapter.status = target;
            chapter.updatedAt = Date.now();
            if (target === 'published') chapter.publishedAt = Date.now();
          } else {
            failed.push(id);
          }
        }
        break;
      }
    }
    if (!found) failed.push(id);
  });
  return { success: failed.length === 0, failed };
}

/** 删除章节（已发布需标题匹配，前端校验后调用） */
export async function deleteChapter(
  id: string,
  titleMatch?: string,
): Promise<{ success: boolean; reason?: string }> {
  await delay(400);
  for (const list of CHAPTER_CACHE.values()) {
    const idx = list.findIndex((c) => c.id === id);
    if (idx >= 0) {
      const chapter = list[idx];
      if (chapter.status === 'published' && titleMatch !== chapter.title) {
        return { success: false, reason: '已发布章节删除需输入正确的章节标题' };
      }
      list.splice(idx, 1);
      return { success: true };
    }
  }
  return { success: false, reason: '章节不存在' };
}
