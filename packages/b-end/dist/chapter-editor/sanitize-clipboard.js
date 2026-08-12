/* ============================================================
 * P2-19-c · 粘贴内容净化
 * 导出 createPasteHandler()，返回 editorProps.handlePaste 钩子。
 * - 清除 inline style / class / id
 * - 保留段落与基础语义标签（p / h2 / h3 / ul / ol / li / blockquote / pre / a / strong / em / u / s）
 * - 粘贴 Word 文档去除 <o:p> 等 Office 命名空间
 * - 截断超长内容（>50000 字符）
 * Source: 04-B端开发计划.md P2-19-c
 * ============================================================ */
import { DOMParser as ProseMirrorDOMParser } from "@tiptap/pm/model";
/** 粘贴内容字符上限：超出则截断，防止恶意超长粘贴拖垮编辑器 */
export const PASTE_MAX_CHARS = 50000;
/** 允许保留的语义标签白名单（其余标签做 unwrap 处理） */
const ALLOWED_TAGS = new Set([
    "P",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "PRE",
    "CODE",
    "BR",
    "HR",
    "A",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "S",
    "STRIKE",
    "SPAN",
]);
/** 需要直接移除（连同内容）的标签：Office 命名空间、脚本、样式、meta */
const DROP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "HEAD",
    "META",
    "LINK",
    "TITLE",
    "O:P",
    "O:SMARTTAGTYPE",
    "ST1:PLACE",
    "ST1:PLACENAME",
    "ST1:PLACETYPE",
    "V:SHAPETYPE",
    "V:SHAPE",
    "IMG",
    "FIGURE",
    "IFRAME",
    "OBJECT",
    "EMBED",
    "VIDEO",
    "AUDIO",
]);
/**
 * 净化粘贴的 HTML 片段。
 * - 移除 Office 命名空间节点、脚本、富媒体
 * - 清除 inline style / class / id / data-* 等属性（保留 a 的 href）
 * - 将白名单外的标签 unwrap（保留其子节点文本）
 * - 截断超长内容
 */
export function sanitizeClipboardHTML(html) {
    if (!html)
        return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    // 先整体截断：基于 body 纯文本长度判断
    const body = doc.body;
    if (body.textContent && body.textContent.length > PASTE_MAX_CHARS) {
        // 截断到上限，超出部分丢弃
        truncateTextNodes(body, PASTE_MAX_CHARS);
    }
    // 递归清理
    cleanNode(body);
    return body.innerHTML;
}
/** 递归清理节点：移除非法标签、清除属性 */
function cleanNode(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child;
            const tag = el.tagName;
            // Office 命名空间或以 "O:" / "ST1:" / "V:" 开头的标签 → 连同内容移除
            if (DROP_TAGS.has(tag) ||
                /^O:/.test(tag) ||
                /^ST1:/.test(tag) ||
                /^V:/.test(tag) ||
                /^M:/.test(tag)) {
                el.remove();
                continue;
            }
            // 白名单外标签 → unwrap（保留子节点）
            if (!ALLOWED_TAGS.has(tag)) {
                // 替换为子节点（保留文本）
                const parent = el.parentNode;
                if (parent) {
                    while (el.firstChild) {
                        parent.insertBefore(el.firstChild, el);
                    }
                    parent.removeChild(el);
                    // 重新清理被提升的子节点（递归处理原 el 的子树）
                    // 由于子节点已提升到 parent，下一轮 children 迭代会处理
                }
                continue;
            }
            // 清除属性：只保留 a[href]
            const attrs = Array.from(el.attributes);
            for (const attr of attrs) {
                const name = attr.name.toLowerCase();
                if (tag === "A" &&
                    (name === "href" || name === "target" || name === "rel")) {
                    continue;
                }
                el.removeAttribute(attr.name);
            }
            // 递归清理子节点
            cleanNode(el);
        }
        else if (child.nodeType === Node.COMMENT_NODE) {
            child.remove();
        }
    }
}
/** 按字符数截断文本节点，保证总纯文本长度不超过 limit */
function truncateTextNodes(root, limit) {
    let count = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    let current = walker.nextNode();
    while (current) {
        texts.push(current);
        current = walker.nextNode();
    }
    for (const textNode of texts) {
        if (count >= limit) {
            textNode.remove();
            continue;
        }
        const remaining = limit - count;
        if (textNode.textContent && textNode.textContent.length > remaining) {
            textNode.textContent = textNode.textContent.slice(0, remaining);
            count = limit;
        }
        else {
            count += textNode.textContent?.length ?? 0;
        }
    }
}
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
export function createPasteHandler() {
    return (view, event, _slice) => {
        // 仅处理富文本粘贴；纯文本（无 html）走默认
        const clipboardData = event.clipboardData;
        if (!clipboardData)
            return false;
        const html = clipboardData.getData("text/html");
        if (!html)
            return false;
        const cleaned = sanitizeClipboardHTML(html);
        if (!cleaned)
            return false;
        // 用编辑器 schema 重新解析净化后的 HTML
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(cleaned, "text/html");
            const slice = ProseMirrorDOMParser.fromSchema(view.state.schema).parseSlice(doc.body);
            const tr = view.state.tr.replaceSelection(slice);
            view.dispatch(tr.scrollIntoView());
            event.preventDefault();
            return true;
        }
        catch {
            // 解析失败则回退到默认粘贴行为
            return false;
        }
    };
}
//# sourceMappingURL=sanitize-clipboard.js.map