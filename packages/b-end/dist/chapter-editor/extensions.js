/* ============================================================
 * P2-19-b · ChapterEditor 扩展聚合
 * 导出 extensions 数组：StarterKit（含 Document/Paragraph/Text/
 *   Bold/Italic/Strike/Heading/BulletList/OrderedList/ListItem/
 *   Blockquote/CodeBlock/HorizontalRule/Undo/Redo）+ Underline + Link
 * 禁用 Image/YouTube 等富媒体扩展，仅保留文本语义。
 * Source: 04-B端开发计划.md P2-19-b
 * ============================================================ */
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
/**
 * 章节编辑器扩展集合。
 *
 * - StarterKit 提供：Document / Paragraph / Text / Bold / Italic / Strike /
 *   Heading / BulletList / OrderedList / ListItem / Blockquote / CodeBlock /
 *   HorizontalRule / HardBreak / History(Undo/Redo) / Dropcursor / Gapcursor
 * - Underline：下划线（StarterKit 不含）
 * - Link：超链接，打开方式强制新标签页，自动链接关掉避免误识别
 *
 * 不包含 Image / YouTube / Table / TaskList 等富媒体扩展：
 * 章节正文仅需排版与基础语义，避免粘贴脏数据。
 */
export const extensions = [
    StarterKit.configure({
        // 关闭可能引入富媒体的默认行为，保留核心语义节点
        heading: { levels: [2, 3] },
    }),
    Underline,
    Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
        },
    }),
];
//# sourceMappingURL=extensions.js.map