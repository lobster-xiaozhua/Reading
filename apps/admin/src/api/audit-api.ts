/* ============================================================
 * P5-2 · 内容审核 Mock API（P6/P8 接真实 API 后替换）
 * 待审队列 + 敏感词清单 + 审核历史 + 提交审核结果
 * Source: 04 §5.6 / P5-2
 * ============================================================ */

import type { AuditLevel, AuditResult, RejectReason } from '@novel/types';

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

/** 审核级别选项 */
export const AUDIT_LEVEL_OPTIONS: { label: string; value: AuditLevel | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '初审', value: 'first' },
  { label: '复审', value: 'second' },
  { label: '终审', value: 'final' },
];

/** 审核级别标签 */
export const AUDIT_LEVEL_LABEL: Record<AuditLevel, { text: string; color: string }> = {
  first: { text: '初审', color: 'processing' },
  second: { text: '复审', color: 'warning' },
  final: { text: '终审', color: 'error' },
};

/** 敏感词等级配色与说明 */
export const SENSITIVE_LEVEL_CONFIG: Record<SensitiveLevel, { color: string; bg: string; label: string; suggestion: string }> = {
  1: {
    color: 'var(--color-feedback-error)',
    bg: 'var(--color-feedback-error-bg)',
    label: '高危',
    suggestion: '建议立即驳回并要求作者重写',
  },
  2: {
    color: 'var(--color-feedback-warning)',
    bg: 'var(--color-feedback-warning-bg)',
    label: '中等',
    suggestion: '建议作者修改后重新提交',
  },
  3: {
    color: 'var(--color-text-tertiary)',
    bg: 'var(--color-bg-subtle)',
    label: '轻微',
    suggestion: '可人工判断是否通过',
  },
};

/** 驳回原因选项 */
export const REJECT_REASON_OPTIONS: { label: string; value: RejectReason }[] = [
  { label: '涉政', value: 'political' },
  { label: '涉黄', value: 'pornographic' },
  { label: '暴力', value: 'violence' },
  { label: '抄袭', value: 'plagiarism' },
  { label: '广告', value: 'advertisement' },
  { label: '其他', value: 'other' },
];

/** 章节正文片段（含敏感词） */
const SAMPLE_CONTENTS = [
  '夜色如墨，少年独自立于山巅，望着远方那道冲天剑光，眼中闪过一丝决然。他握紧手中长刀，向那神秘组织发起最后的冲锋。血液染红了青石板路，但他心中的信念从未动摇。',
  '酒楼之中，少年翻看着手中的秘籍，眉头紧锁。这其中的奥妙，远超他的想象。正当他沉思之际，楼下突然传来一阵喧嚣，似乎有人在推销什么违禁药品，让他眉头一皱。',
  '城外百里，敌军压境，少年立于城墙之上，望着那黑压压的一片。他知道，这一战避无可避。剑光一闪，第一波进攻被击退，但他的心中却隐隐感到一丝不安。',
  '皇宫深处，那位神秘的贵妃正与一名黑衣人密谋。"这件事，必须在天亮前办妥。"她低声说道。黑衣人点头，转身消失在夜色之中，留下贵妃独自凝视着那杯毒酒。',
  '突破的瞬间，丹田中那枚金丹开始缓缓转动。少年强忍着经脉中的剧痛，引导体内灵力汇聚。这一刻，他仿佛听到了大道的回响，师父的话再次回响在耳畔。',
];

/** 敏感词池 */
const SENSITIVE_WORDS: { text: string; level: SensitiveLevel; suggestion: string }[] = [
  { text: '神秘组织', level: 1, suggestion: '涉政敏感词，建议替换为「帮派」或「门派」' },
  { text: '违禁药品', level: 1, suggestion: '涉政敏感词，建议删除或替换为「丹药」' },
  { text: '毒酒', level: 2, suggestion: '暴力元素，建议弱化描写' },
  { text: '血液染红', level: 2, suggestion: '暴力描写，建议改为「汗水湿透」' },
  { text: '敌军压境', level: 3, suggestion: '可人工判断，建议保留但留意上下文' },
];

/** 生成 mock 待审队列 */
let MOCK_QUEUE: AuditItem[] = [];
let HISTORY_MAP: Map<string, AuditHistoryEntry[]> = new Map();
let TODAY_PROCESSED = 0;

function initQueue() {
  if (MOCK_QUEUE.length > 0) return;
  const now = Date.now();
  const levels: AuditLevel[] = ['first', 'second', 'final'];
  const novelTitles = ['斗破苍穹', '凡人修仙传', '遮天', '诡秘之主', '大奉打更人'];
  const authors = ['天蚕土豆', '忘语', '辰东', '爱潜水的乌贼', '卖报小郎君'];

  MOCK_QUEUE = Array.from({ length: 12 }).map((_, i) => {
    const content = SAMPLE_CONTENTS[i % SAMPLE_CONTENTS.length];
    // 注入敏感词命中
    const hits: SensitiveHit[] = [];
    let modifiedContent = content;
    const wordsToInject = SENSITIVE_WORDS.slice(i % 3, (i % 3) + 2);
    wordsToInsert: for (const sw of wordsToInject) {
      const offset = (i * 7 + sw.text.length) % Math.max(1, modifiedContent.length - sw.text.length);
      modifiedContent =
        modifiedContent.slice(0, offset) + sw.text + modifiedContent.slice(offset);
      hits.push({
        text: sw.text,
        level: sw.level,
        offset,
        suggestion: sw.suggestion,
      });
    }
    return {
      id: `audit-${String(i + 1).padStart(4, '0')}`,
      chapterTitle: `第 ${i + 100} 章 ${['风云再起', '暗流涌动', '决战之巅', '归隐山林', '重返巅峰'][i % 5]}`,
      novelTitle: novelTitles[i % novelTitles.length],
      author: authors[i % authors.length],
      level: levels[i % 3],
      submittedAt: now - i * 1800000,
      content: modifiedContent,
      sensitiveHits: hits.sort((a, b) => a.offset - b.offset),
      wordCount: content.length,
    };
  });

  // 预填审核历史
  MOCK_QUEUE.slice(0, 5).forEach((item, i) => {
    HISTORY_MAP.set(item.id, [
      {
        id: `hist-${item.id}-1`,
        time: new Date(now - i * 3600000 - 1800000).toLocaleString('zh-CN'),
        operator: '系统',
        result: 'approve',
        comment: '初审通过，进入复审。',
      },
      ...(i % 3 === 0
        ? [{
            id: `hist-${item.id}-2`,
            time: new Date(now - i * 3600000 - 900000).toLocaleString('zh-CN'),
            operator: '审核员B',
            result: 'revise' as AuditResult,
            comment: '请作者确认第 3 段细节描写。',
          }]
        : []),
    ]);
  });
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** 拉取待审队列 */
export async function fetchAuditQueue(level: AuditLevel | 'all' = 'all'): Promise<{
  list: AuditItem[];
  stats: AuditQueueStats;
}> {
  await delay(300);
  initQueue();
  const list = level === 'all' ? [...MOCK_QUEUE] : MOCK_QUEUE.filter((i) => i.level === level);
  const byLevel: Record<AuditLevel, number> = { first: 0, second: 0, final: 0 };
  MOCK_QUEUE.forEach((i) => { byLevel[i.level]++; });
  return {
    list,
    stats: {
      pendingCount: MOCK_QUEUE.length,
      todayProcessed: TODAY_PROCESSED,
      byLevel,
    },
  };
}

/** 拉取审核历史 */
export async function fetchAuditHistory(itemId: string): Promise<AuditHistoryEntry[]> {
  await delay(150);
  return HISTORY_MAP.get(itemId) ?? [];
}

/** 提交审核结果 */
export async function submitAudit(params: AuditSubmitParams): Promise<{ success: boolean; nextId?: string }> {
  await delay(500);
  initQueue();
  const removedIds = new Set(params.ids);
  MOCK_QUEUE = MOCK_QUEUE.filter((i) => !removedIds.has(i.id));
  TODAY_PROCESSED += params.ids.length;

  // 记录历史（针对每条）
  params.ids.forEach((id) => {
    const history = HISTORY_MAP.get(id) ?? [];
    history.push({
      id: `hist-${id}-${Date.now()}`,
      time: new Date().toLocaleString('zh-CN'),
      operator: '当前管理员',
      result: params.result,
      comment: params.comment,
      rejectReason: params.rejectReason,
    });
    HISTORY_MAP.set(id, history);
  });

  // 返回下一条待审 ID（连续处理）
  const next = MOCK_QUEUE[0];
  return { success: true, nextId: next?.id };
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

export function splitContentBySensitive(content: string, hits: SensitiveHit[]): ContentSegment[] {
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
