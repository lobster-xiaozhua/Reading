import type { Editor } from "@tiptap/core";
/** 自动保存状态 */
export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";
/** useAutoSave 配置 */
export interface UseAutoSaveOptions {
    /** 保存回调，返回 Promise；失败则置 error 状态 */
    onSave: (html: string) => void | Promise<void>;
    /** 节流间隔（ms），默认 30000（30s） */
    interval?: number;
}
/** useAutoSave 返回值 */
export interface UseAutoSaveResult {
    /** 当前保存状态 */
    status: AutoSaveStatus;
    /** 上次保存成功时间戳（ms），null 表示从未保存 */
    lastSavedAt: number | null;
    /** 手动触发保存（绕过节流） */
    saveNow: () => Promise<void>;
}
/**
 * 章节自动保存 Hook。
 *
 * - 监听 editor 的 onUpdate，标记内容已变更
 * - 节流：距离上次保存不足 interval 不重复保存
 * - beforeunload：存在未保存内容时弹出浏览器离开确认
 *
 * @example
 * const autoSave = useAutoSave(editor, { onSave: async (html) => api.save(html) });
 */
export declare function useAutoSave(editor: Editor | null, options: UseAutoSaveOptions): UseAutoSaveResult;
//# sourceMappingURL=useAutoSave.d.ts.map