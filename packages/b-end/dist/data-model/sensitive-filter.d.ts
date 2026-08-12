import type { SensitiveLevel, SensitiveWord } from "../chapter-editor/sensitive-decorations.js";
/** 敏感词命中（带正文偏移，供高亮定位） */
export interface SensitiveHit {
    /** 命中文字 */
    text: string;
    /** 等级：1 严禁 / 2 警告 / 3 提示 */
    level: SensitiveLevel;
    /** 在纯文本中的起始偏移 */
    offset: number;
    /** 处理建议 */
    suggestion?: string;
}
/** 过滤动作（对应三级策略） */
export type FilterAction = "block" | "require-audit" | "hint";
/** 等级 → 动作映射（P8-1-2） */
export declare const LEVEL_POLICY: Record<SensitiveLevel, FilterAction>;
/** 等级元数据：配色 / 标签 / 默认建议（P8-1-3） */
export declare const SENSITIVE_LEVEL_META: Record<SensitiveLevel, {
    color: string;
    bg: string;
    label: string;
    action: FilterAction;
    defaultSuggestion: string;
}>;
/** 取等级对应的过滤动作 */
export declare function getFilterAction(level: SensitiveLevel): FilterAction;
/**
 * 扫描纯文本/HTML，返回所有敏感词命中（按 offset 升序）。
 * 不区分大小写子串匹配；同一词多次出现分别返回。
 *
 * @param text 纯文本或 HTML（自动剥标签）
 * @param words 敏感词库
 */
export declare function scanText(text: string, words: readonly SensitiveWord[]): SensitiveHit[];
/**
 * 保存前校验：是否应拦截保存。
 * 一级（block）命中即拦截，返回首个拦截命中。
 */
export declare function shouldBlockSave(hits: readonly SensitiveHit[]): {
    blocked: boolean;
    firstBlockHit?: SensitiveHit;
};
/**
 * 是否存在需人工审核的命中（二级）。
 */
export declare function hasRequireAudit(hits: readonly SensitiveHit[]): boolean;
/** 内容拆段（供正文内高亮渲染） */
export interface ContentSegment {
    text: string;
    isHit: boolean;
    hit?: SensitiveHit;
}
/**
 * 将正文按敏感词命中拆分为高亮片段。
 * @param content 纯文本（需与 hits 的 offset 同口径，即 stripHtml 后）
 * @param hits 命中清单
 */
export declare function splitContentBySensitive(content: string, hits: readonly SensitiveHit[]): ContentSegment[];
//# sourceMappingURL=sensitive-filter.d.ts.map