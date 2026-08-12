import type { EditorView } from "@tiptap/pm/view";
import type { Slice } from "@tiptap/pm/model";
/** 粘贴内容字符上限：超出则截断，防止恶意超长粘贴拖垮编辑器 */
export declare const PASTE_MAX_CHARS = 50000;
/**
 * 净化粘贴的 HTML 片段。
 * - 移除 Office 命名空间节点、脚本、富媒体
 * - 清除 inline style / class / id / data-* 等属性（保留 a 的 href）
 * - 将白名单外的标签 unwrap（保留其子节点文本）
 * - 截断超长内容
 */
export declare function sanitizeClipboardHTML(html: string): string;
/**
 * 创建 editorProps.handlePaste 钩子。
 *
 * 行为：
 * 1. 读取剪贴板 HTML，净化后重新解析为 ProseMirror 切片
 * 2. 走编辑器 schema 校验，仅插入合法节点
 * 3. 返回 true 表示已处理（阻止默认粘贴）
 *
 * @example
 * useEditor({ editorProps: { handlePaste: createPasteHandler() } })
 */
export declare function createPasteHandler(): (view: EditorView, event: ClipboardEvent, _slice: Slice) => boolean;
//# sourceMappingURL=sanitize-clipboard.d.ts.map