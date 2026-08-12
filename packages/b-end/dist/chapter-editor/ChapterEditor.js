import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * P2-19 · ChapterEditor · 章节富文本编辑器（B 端最复杂组件）
 * 组合 EditorCore + 工具栏 + 状态栏
 * - 工具栏 sticky 顶部，背景 var(--color-bg-subtle)
 * - 状态栏底部固定，var(--font-mono) 显示字数
 * - 编辑区对齐 C 端阅读器：段首缩进 2em / 行高 1.8 / 18px
 * - published 模式覆盖前 Modal 二次确认
 * Source: 04-B端开发计划.md P2-19
 * ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, Tooltip, Divider, Space } from "antd";
import { BoldOutlined, ItalicOutlined, UnderlineOutlined, StrikethroughOutlined, UnorderedListOutlined, OrderedListOutlined, CodeOutlined, LinkOutlined, UndoOutlined, RedoOutlined, LineOutlined, } from "@ant-design/icons";
import { useEditorState } from "@tiptap/react";
import { EditorCore } from "./EditorCore.js";
import { useAutoSave } from "./useAutoSave.js";
import { countPureWords, countWithPunctuation, } from "../data-model/word-count.js";
import { scanText } from "../data-model/sensitive-filter.js";
/** 状态栏自动保存文案 */
function autoSaveLabel(status, lastSavedAt) {
    switch (status) {
        case "saving":
            return "保存中…";
        case "saved":
            return lastSavedAt
                ? `已保存 ${new Date(lastSavedAt).toLocaleTimeString("zh-CN")}`
                : "已保存";
        case "error":
            return "保存失败";
        default:
            return lastSavedAt
                ? `上次保存 ${new Date(lastSavedAt).toLocaleTimeString("zh-CN")}`
                : "未保存";
    }
}
/**
 * ChapterEditor · 章节富文本编辑器。
 *
 * 组合 EditorCore（TipTap 内核）+ sticky 工具栏 + 底部状态栏。
 * 工具栏按钮：粗体/斜体/下划线/删除线/H2/H3/无序列表/有序列表/引用/代码块/分割线/链接/撤销/重做。
 */
export function ChapterEditor(props) {
    const { value, onChange, mode = "create", autoSave = false, onSave, autoSaveInterval, onWordCountChange, sensitiveCheck = false, sensitiveWords, onSensitiveHit, placeholder, className, } = props;
    const [editor, setEditor] = useState(null);
    // published 模式：首次覆盖确认标记
    const publishedConfirmedRef = useRef(false);
    // 待确认的 html（published 模式拦截后缓存）
    const pendingHtmlRef = useRef(null);
    // autoSave 引用，供 useAutoSave 的 onSave wrapper 读取最新值
    const autoSaveRef = useRef(autoSave);
    autoSaveRef.current = autoSave;
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;
    // 实际生效的敏感词列表
    const effectiveSensitiveWords = useMemo(() => (sensitiveCheck ? (sensitiveWords ?? []) : []), [sensitiveCheck, sensitiveWords]);
    // 自动保存：始终调用 hook（规则要求），onSave 内按 autoSave 开关决定是否真正保存
    const handleAutoSave = useCallback(async (html) => {
        if (!autoSaveRef.current)
            return;
        await onSaveRef.current?.(html);
    }, []);
    const autoSaveState = useAutoSave(editor, {
        onSave: handleAutoSave,
        interval: autoSaveInterval,
    });
    // 响应式工具栏状态（active / can）
    const toolbarState = useEditorState({
        editor,
        selector: ({ editor: ed }) => {
            if (!ed)
                return null;
            return {
                bold: ed.isActive("bold"),
                italic: ed.isActive("italic"),
                underline: ed.isActive("underline"),
                strike: ed.isActive("strike"),
                h2: ed.isActive("heading", { level: 2 }),
                h3: ed.isActive("heading", { level: 3 }),
                bulletList: ed.isActive("bulletList"),
                orderedList: ed.isActive("orderedList"),
                blockquote: ed.isActive("blockquote"),
                codeBlock: ed.isActive("codeBlock"),
                link: ed.isActive("link"),
                canUndo: ed.can().undo(),
                canRedo: ed.can().redo(),
            };
        },
    });
    // 字数统计（基于受控 HTML）
    const wordCount = useMemo(() => {
        return {
            pure: countPureWords(value),
            withPunctuation: countWithPunctuation(value),
        };
    }, [value]);
    // 字数变更回调
    useEffect(() => {
        onWordCountChange?.(wordCount);
    }, [wordCount, onWordCountChange]);
    // P8-1-4 敏感词命中回调（节流 300ms，与装饰插件一致）
    const sensitiveHitsRef = useRef([]);
    const lastScanAtRef = useRef(0);
    useEffect(() => {
        if (!sensitiveCheck || effectiveSensitiveWords.length === 0) {
            if (sensitiveHitsRef.current.length > 0) {
                sensitiveHitsRef.current = [];
                onSensitiveHit?.([]);
            }
            return;
        }
        const now = Date.now();
        if (now - lastScanAtRef.current < 300)
            return;
        lastScanAtRef.current = now;
        const hits = scanText(value, effectiveSensitiveWords);
        sensitiveHitsRef.current = hits;
        onSensitiveHit?.(hits);
    }, [value, sensitiveCheck, effectiveSensitiveWords, onSensitiveHit]);
    // 切换章节（mode/value 重置）时重置 published 确认标记
    useEffect(() => {
        publishedConfirmedRef.current = false;
        pendingHtmlRef.current = null;
    }, [mode]);
    /** published 模式：首次编辑二次确认 */
    const confirmPublishedEdit = useCallback((html) => {
        // 非 published 或已确认 → 直接放行
        if (mode !== "published" || publishedConfirmedRef.current) {
            return true;
        }
        // 拦截：弹确认框
        pendingHtmlRef.current = html;
        Modal.confirm({
            title: "修改已发布章节",
            content: "该章节已发布，修改将覆盖线上内容。是否继续编辑？",
            okText: "继续编辑",
            cancelText: "取消",
            onOk: () => {
                publishedConfirmedRef.current = true;
                if (pendingHtmlRef.current !== null) {
                    onChange?.(pendingHtmlRef.current);
                    pendingHtmlRef.current = null;
                }
            },
            onCancel: () => {
                // 取消：回退编辑器内容到原 value
                if (editor) {
                    editor.commands.setContent(value || "", false);
                }
                pendingHtmlRef.current = null;
            },
        });
        return false; // 拦截本次 onChange
    }, [mode, editor, value, onChange]);
    /** EditorCore 内容变更处理 */
    const handleChange = useCallback((html) => {
        if (!confirmPublishedEdit(html))
            return;
        onChange?.(html);
    }, [confirmPublishedEdit, onChange]);
    // ---------- 工具栏命令 ----------
    const run = useCallback((fn) => {
        if (!editor)
            return;
        editor.chain().focus().run();
        fn(editor);
    }, [editor]);
    const handleLink = useCallback(() => {
        if (!editor)
            return;
        const previous = editor.getAttributes("link").href;
        // 简单实现：用浏览器 prompt 收集 URL（B 端后台可接受）
        const href = typeof window !== "undefined"
            ? window.prompt("请输入链接地址（留空取消链接）", previous ?? "https://")
            : (previous ?? "");
        if (href === null)
            return;
        if (href === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }, [editor]);
    const buttons = useMemo(() => {
        const s = toolbarState;
        return [
            {
                key: "bold",
                label: "粗体",
                icon: _jsx(BoldOutlined, {}),
                active: s?.bold,
                onClick: () => run((e) => e.chain().toggleBold().run()),
            },
            {
                key: "italic",
                label: "斜体",
                icon: _jsx(ItalicOutlined, {}),
                active: s?.italic,
                onClick: () => run((e) => e.chain().toggleItalic().run()),
            },
            {
                key: "underline",
                label: "下划线",
                icon: _jsx(UnderlineOutlined, {}),
                active: s?.underline,
                onClick: () => run((e) => e.chain().toggleUnderline().run()),
            },
            {
                key: "strike",
                label: "删除线",
                icon: _jsx(StrikethroughOutlined, {}),
                active: s?.strike,
                onClick: () => run((e) => e.chain().toggleStrike().run()),
            },
            {
                key: "h2",
                label: "标题2",
                text: "H2",
                active: s?.h2,
                onClick: () => run((e) => e.chain().toggleHeading({ level: 2 }).run()),
            },
            {
                key: "h3",
                label: "标题3",
                text: "H3",
                active: s?.h3,
                onClick: () => run((e) => e.chain().toggleHeading({ level: 3 }).run()),
            },
            {
                key: "bulletList",
                label: "无序列表",
                icon: _jsx(UnorderedListOutlined, {}),
                active: s?.bulletList,
                onClick: () => run((e) => e.chain().toggleBulletList().run()),
            },
            {
                key: "orderedList",
                label: "有序列表",
                icon: _jsx(OrderedListOutlined, {}),
                active: s?.orderedList,
                onClick: () => run((e) => e.chain().toggleOrderedList().run()),
            },
            {
                key: "blockquote",
                label: "引用",
                text: "“”",
                active: s?.blockquote,
                onClick: () => run((e) => e.chain().toggleBlockquote().run()),
            },
            {
                key: "codeBlock",
                label: "代码块",
                icon: _jsx(CodeOutlined, {}),
                active: s?.codeBlock,
                onClick: () => run((e) => e.chain().toggleCodeBlock().run()),
            },
            {
                key: "hr",
                label: "分割线",
                icon: _jsx(LineOutlined, {}),
                onClick: () => run((e) => e.chain().setHorizontalRule().run()),
            },
            {
                key: "link",
                label: "链接",
                icon: _jsx(LinkOutlined, {}),
                active: s?.link,
                onClick: handleLink,
            },
            {
                key: "undo",
                label: "撤销",
                icon: _jsx(UndoOutlined, {}),
                disabled: !s?.canUndo,
                onClick: () => run((e) => e.chain().undo().run()),
            },
            {
                key: "redo",
                label: "重做",
                icon: _jsx(RedoOutlined, {}),
                disabled: !s?.canRedo,
                onClick: () => run((e) => e.chain().redo().run()),
            },
        ];
    }, [toolbarState, run, handleLink]);
    // ---------- 渲染 ----------
    const toolbarStyle = {
        position: "sticky",
        top: 0,
        zIndex: "var(--z-index-sticky)",
        background: "var(--color-bg-subtle)",
        borderBottom: "1px solid var(--color-border-subtle)",
        padding: "var(--space-2) var(--space-3)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
        flexWrap: "wrap",
    };
    const statusBarStyle = {
        position: "sticky",
        bottom: 0,
        zIndex: "var(--z-index-sticky)",
        background: "var(--color-bg-subtle)",
        borderTop: "1px solid var(--color-border-subtle)",
        padding: "var(--space-2) var(--space-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--font-size-caption, 13px)",
        color: "var(--color-text-secondary)",
    };
    return (_jsxs("div", { className: className, style: {
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-surface)",
            overflow: "hidden",
        }, children: [_jsx("div", { className: "chapter-editor__toolbar", style: toolbarStyle, children: _jsx(Space, { size: 2, wrap: true, children: buttons.map((btn) => (_jsxs("span", { style: { display: "inline-flex" }, children: [_jsx(Tooltip, { title: btn.label, children: _jsx(Button, { type: "text", size: "small", disabled: btn.disabled, onClick: btn.onClick, "aria-label": btn.label, style: {
                                        minWidth: 32,
                                        height: 32,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: btn.active
                                            ? "var(--color-brand)"
                                            : "var(--color-text-primary)",
                                        background: btn.active
                                            ? "var(--color-brand-bg)"
                                            : "transparent",
                                    }, children: btn.icon ?? btn.text }) }), (btn.key === "h2" ||
                                btn.key === "bulletList" ||
                                btn.key === "blockquote" ||
                                btn.key === "codeBlock" ||
                                btn.key === "hr" ||
                                btn.key === "undo") && (_jsx(Divider, { type: "vertical", style: { margin: "0 var(--space-1)" } }))] }, btn.key))) }) }), _jsxs("div", { className: "chapter-editor__body", style: {
                    padding: "var(--space-6) var(--space-8)",
                    minHeight: 400,
                    overflowY: "auto",
                }, children: [_jsx(EditorCore, { value: value, onChange: handleChange, placeholder: placeholder, sensitiveWords: effectiveSensitiveWords, onEditorReady: setEditor, className: "chapter-editor__core" }), _jsx("style", { children: `
          .chapter-editor__content { outline: none; min-height: 360px; }
          .chapter-editor__content p {
            text-indent: 2em;
            margin: 0 0 var(--novel-paragraph-spacing, 1em);
          }
          .chapter-editor__content p:first-child { text-indent: 2em; }
          .chapter-editor__content h2,
          .chapter-editor__content h3 { text-indent: 0; margin: var(--space-4) 0 var(--space-2); }
          .chapter-editor__content ul,
          .chapter-editor__content ol { text-indent: 0; padding-left: var(--space-6); margin: 0 0 1em; }
          .chapter-editor__content blockquote {
            text-indent: 0;
            border-left: 3px solid var(--color-border-default);
            padding-left: var(--space-4);
            color: var(--color-text-secondary);
            margin: 0 0 1em;
          }
          .chapter-editor__content pre {
            text-indent: 0;
            background: var(--color-bg-subtle);
            border-radius: var(--radius-sm);
            padding: var(--space-3);
            font-family: var(--font-mono);
            font-size: 14px;
          }
          .chapter-editor__content[data-placeholder]:empty::before {
            content: attr(data-placeholder);
            color: var(--color-text-tertiary);
            pointer-events: none;
          }
        ` })] }), _jsxs("div", { className: "chapter-editor__statusbar", style: statusBarStyle, children: [_jsxs("span", { children: ["\u7EAF\u6587\u5B57", " ", _jsx("strong", { style: { color: "var(--color-text-primary)" }, children: wordCount.pure }), _jsx("span", { style: {
                                    margin: "0 var(--space-2)",
                                    color: "var(--color-text-tertiary)",
                                }, children: "\u00B7" }), "\u542B\u6807\u70B9", " ", _jsx("strong", { style: { color: "var(--color-text-primary)" }, children: wordCount.withPunctuation })] }), _jsxs("span", { style: {
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                        }, children: [autoSave && (_jsx("span", { style: { color: "var(--color-text-tertiary)" }, children: autoSaveLabel(autoSaveState.status, autoSaveState.lastSavedAt) })), _jsx("span", { style: { color: "var(--color-text-tertiary)" }, children: mode === "published"
                                    ? "已发布"
                                    : mode === "draft"
                                        ? "草稿"
                                        : "新建" })] })] })] }));
}
//# sourceMappingURL=ChapterEditor.js.map