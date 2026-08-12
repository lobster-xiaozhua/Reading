import { Extension } from "@tiptap/core";
import { type EditorView } from "@tiptap/pm/view";
/** 敏感词分级 */
export type SensitiveLevel = 1 | 2 | 3;
/** 敏感词条目 */
export interface SensitiveWord {
    /** 敏感词文本（将作为不区分大小写的子串匹配） */
    text: string;
    /** 分级：1 严禁 / 2 警告 / 3 提示 */
    level: SensitiveLevel;
    /** 处理建议（可选，P8-1 统一模型） */
    suggestion?: string;
}
/**
 * 创建敏感词装饰 TipTap 扩展。
 *
 * @param words 敏感词列表
 * @returns TipTap Extension，可通过 extensions 数组聚合
 *
 * @example
 * import { createSensitivePlugin } from './sensitive-decorations.js';
 * const ext = createSensitivePlugin([{ text: '暴力', level: 1 }]);
 */
export declare function createSensitivePlugin(words: SensitiveWord[]): Extension<any, any>;
/**
 * 强制立即刷新敏感词装饰（绕过节流）。
 * 用于敏感词列表变更后立即重绘。调用方式：editor.view.dispatch(empty tr) 触发重算。
 *
 * 这里提供一个工具：通过 view 派发一个带 meta 的空事务，
 * 插件可识别 meta 后强制重算。为保持实现简洁，直接读取当前 state 重建。
 */
export declare function refreshSensitiveDecorations(view: EditorView, words: SensitiveWord[]): void;
//# sourceMappingURL=sensitive-decorations.d.ts.map