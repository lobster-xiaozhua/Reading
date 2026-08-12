import type { Editor } from "@tiptap/core";
import type { SensitiveWord } from "./sensitive-decorations.js";
export interface EditorCoreProps {
    /** 受控 HTML 内容 */
    value: string;
    /** 内容变更回调（返回最新 HTML） */
    onChange?: (html: string) => void;
    /** 是否可编辑，默认 true */
    editable?: boolean;
    /** 占位提示文本 */
    placeholder?: string;
    /** 敏感词列表；非空时启用敏感词高亮装饰 */
    sensitiveWords?: SensitiveWord[];
    /** 编辑器创建后回调，把 editor 实例交给父组件 */
    onEditorReady?: (editor: Editor | null) => void;
    /** 编辑区根容器 className */
    className?: string;
}
/**
 * EditorCore · 章节富文本编辑内核。
 *
 * 受控绑定流程：
 * 1. 初始化：content = value
 * 2. 用户编辑 → onUpdate → onChange(getHTML()) → 父组件 setState(value)
 * 3. 外部 value 变更（非用户编辑）→ useEffect 检测差异 → setContent(value, false)
 *
 * emitUpdate=false 避免 setContent 触发 onUpdate 形成死循环；
 * 字符串比对避免光标跳变。
 */
export declare function EditorCore(props: EditorCoreProps): import("react").JSX.Element;
//# sourceMappingURL=EditorCore.d.ts.map