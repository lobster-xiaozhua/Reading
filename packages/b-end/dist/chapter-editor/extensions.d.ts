import type { Extensions } from "@tiptap/core";
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
export declare const extensions: Extensions;
//# sourceMappingURL=extensions.d.ts.map