import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P2-19-a · EditorCore · TipTap 编辑器内核
 * @tiptap/react 的 useEditor + EditorContent
 * - 受控 value（HTML 字符串）↔ getHTML()/setContent() 双向绑定
 * - extensions 数组聚合（从 extensions.ts 导入 + 可选敏感词插件）
 * - 内置粘贴净化（createPasteHandler）
 * - 通过 onEditorReady 把 editor 实例交给父组件（工具栏/自动保存用）
 * Source: 04-B端开发计划.md P2-19-a
 * ============================================================ */
import { useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { extensions as baseExtensions } from "./extensions.js";
import { createPasteHandler } from "./sanitize-clipboard.js";
import { createSensitivePlugin } from "./sensitive-decorations.js";
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
export function EditorCore(props) {
    const { value, onChange, editable = true, placeholder, sensitiveWords, onEditorReady, className, } = props;
    // 聚合扩展：base + 敏感词插件（按 sensitiveWords 重建）
    const extensions = useMemo(() => {
        const list = [...baseExtensions];
        if (sensitiveWords && sensitiveWords.length > 0) {
            list.push(createSensitivePlugin(sensitiveWords));
        }
        return list;
        // sensitiveWords omitted: using JSON.stringify for deep comparison
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(sensitiveWords), baseExtensions]);
    // 内部变更标记：onUpdate 触发的 onChange 不应再回灌 setContent
    const internalChangeRef = useRef(false);
    const editor = useEditor({
        extensions,
        content: value,
        editable,
        editorProps: {
            // 粘贴净化：去除 Word 命名空间 / inline style / class / id
            handlePaste: createPasteHandler(),
            attributes: {
                class: "chapter-editor__content",
                "data-placeholder": placeholder ?? "",
                style: "font-size: 18px;" +
                    "line-height: 1.8;" +
                    "color: var(--color-text-primary);" +
                    "font-family: var(--novel-font-family, var(--font-serif));",
            },
        },
        onUpdate: ({ editor: ed }) => {
            internalChangeRef.current = true;
            onChange?.(ed.getHTML());
        },
        // 客户端后台无 SSR，立即渲染以拿到非空 editor
        immediatelyRender: true,
    });
    // editable 同步
    useEffect(() => {
        if (editor && editor.isEditable !== editable) {
            editor.setEditable(editable);
        }
    }, [editor, editable]);
    // 外部 value → editor 同步（仅当非内部触发且 HTML 不一致）
    useEffect(() => {
        if (!editor)
            return;
        if (internalChangeRef.current) {
            internalChangeRef.current = false;
            return;
        }
        if (editor.getHTML() !== value) {
            // emitUpdate=false 防止触发 onUpdate 死循环
            editor.commands.setContent(value || "", false);
        }
    }, [value, editor]);
    // 把 editor 实例交给父组件
    useEffect(() => {
        onEditorReady?.(editor);
        return () => {
            onEditorReady?.(null);
        };
    }, [editor, onEditorReady]);
    return (_jsx("div", { className: className, style: { position: "relative" }, children: _jsx(EditorContent, { editor: editor }) }));
}
//# sourceMappingURL=EditorCore.js.map