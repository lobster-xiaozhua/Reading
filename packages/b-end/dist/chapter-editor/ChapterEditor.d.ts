import type { SensitiveWord } from "./sensitive-decorations.js";
import { type SensitiveHit } from "../data-model/sensitive-filter.js";
/** 编辑模式 */
export type ChapterEditorMode = "create" | "draft" | "published";
export interface ChapterEditorProps {
    /** 受控 HTML 内容 */
    value: string;
    /** 内容变更回调 */
    onChange?: (html: string) => void;
    /** 编辑模式：create 新建 / draft 草稿 / published 已发布（覆盖前二次确认） */
    mode?: ChapterEditorMode;
    /** 是否启用自动保存，默认 false */
    autoSave?: boolean;
    /** 自动保存回调（autoSave=true 时必填） */
    onSave?: (html: string) => void | Promise<void>;
    /** 自动保存节流间隔（ms），默认 30000 */
    autoSaveInterval?: number;
    /** 字数变更回调（双口径） */
    onWordCountChange?: (count: {
        pure: number;
        withPunctuation: number;
    }) => void;
    /** 是否启用敏感词检测，默认 false */
    sensitiveCheck?: boolean;
    /** 敏感词列表（sensitiveCheck=true 时生效） */
    sensitiveWords?: SensitiveWord[];
    /** 敏感词命中回调（sensitiveCheck=true 时随内容变更节流上报，P8-1-4） */
    onSensitiveHit?: (hits: SensitiveHit[]) => void;
    /** 占位提示 */
    placeholder?: string;
    /** 根容器 className */
    className?: string;
}
/**
 * ChapterEditor · 章节富文本编辑器。
 *
 * 组合 EditorCore（TipTap 内核）+ sticky 工具栏 + 底部状态栏。
 * 工具栏按钮：粗体/斜体/下划线/删除线/H2/H3/无序列表/有序列表/引用/代码块/分割线/链接/撤销/重做。
 */
export declare function ChapterEditor(props: ChapterEditorProps): import("react").JSX.Element;
//# sourceMappingURL=ChapterEditor.d.ts.map