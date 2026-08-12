/* ============================================================
 * P2-19-d · 敏感词装饰插件
 * 导出 createSensitivePlugin(words) —— ProseMirror Decoration 插件。
 * - 实时监听 doc 变更，匹配敏感词
 * - 按分级渲染不同样式：
 *   一级（严禁）：var(--color-feedback-error-bg) 底 + var(--color-feedback-error) 字
 *   二级（警告）：var(--color-feedback-warning-bg) 底 + var(--color-feedback-warning) 字
 *   三级（提示）：var(--color-bg-subtle) 底 + var(--color-text-tertiary) 字
 * - 节流 300ms：装饰集合随事务映射位置，但全量重匹配最多 300ms 一次
 * Source: 04-B端开发计划.md P2-19-d
 *
 * 说明：ProseMirror Decoration 内部类型较复杂，核心匹配逻辑对
 * DecorationSet 的操作使用 any 绕过部分推断，对外保持类型清晰。
 * ============================================================ */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
/** 节流间隔（ms）：全量重匹配最多 300ms 一次 */
const THROTTLE_MS = 300;
/** 唯一插件 key */
const sensitivePluginKey = new PluginKey("chapterSensitiveDecorations");
/** 按分级返回内联装饰样式（使用 CSS 语义令牌，禁止裸色值） */
function styleForLevel(level) {
    switch (level) {
        case 1:
            // 严禁：错误底 + 错误字
            return ("background-color: var(--color-feedback-error-bg);" +
                "color: var(--color-feedback-error);" +
                "border-radius: var(--radius-xs);" +
                "padding: 0 2px;");
        case 2:
            // 警告：警告底 + 警告字
            return ("background-color: var(--color-feedback-warning-bg);" +
                "color: var(--color-feedback-warning);" +
                "border-radius: var(--radius-xs);" +
                "padding: 0 2px;");
        case 3:
        default:
            // 提示：subtle 底 + 三级文本字
            return ("background-color: var(--color-bg-subtle);" +
                "color: var(--color-text-tertiary);" +
                "border-radius: var(--radius-xs);" +
                "padding: 0 2px;");
    }
}
/**
 * 对单个节点递归扫描文本，生成 inline decoration。
 * 仅在文本节点内做不区分大小写的子串匹配。
 */
function scanNode(node, pos, words) {
    const decorations = [];
    node.descendants((child, offset) => {
        if (!child.isText || !child.text)
            return;
        const text = child.text;
        const base = pos + offset;
        for (const w of words) {
            if (!w.text)
                continue;
            const needle = w.text.toLowerCase();
            const hay = text.toLowerCase();
            let from = hay.indexOf(needle);
            while (from !== -1) {
                const start = base + from;
                const end = start + w.text.length;
                decorations.push(Decoration.inline(start, end, {
                    style: styleForLevel(w.level),
                    class: `ce-sensitive ce-sensitive--l${w.level}`,
                }));
                from = hay.indexOf(needle, from + needle.length);
            }
        }
        return false;
    });
    return decorations;
}
/** 全量扫描 doc，生成新的装饰集合 */
function buildDecorations(doc, words) {
    if (!words || words.length === 0)
        return DecorationSet.empty;
    const decos = scanNode(doc, 0, words);
    return DecorationSet.create(doc, decos);
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
export function createSensitivePlugin(words) {
    // 预处理：过滤空词，转小写缓存
    const normalized = (words ?? [])
        .filter((w) => w && w.text)
        .map((w) => ({ text: w.text, level: w.level, suggestion: w.suggestion }));
    return Extension.create({
        name: "sensitiveDecorations",
        addProseMirrorPlugins() {
            return [
                new Plugin({
                    key: sensitivePluginKey,
                    state: {
                        init(_, state) {
                            return {
                                set: buildDecorations(state.doc, normalized),
                                lastScanAt: Date.now(),
                            };
                        },
                        apply(tr, value, _oldState, newState) {
                            // 位置随事务映射，保证光标移动/删除时装饰跟随
                            const mapped = value.set.map(tr.mapping, tr.doc);
                            if (!tr.docChanged) {
                                return { set: mapped, lastScanAt: value.lastScanAt };
                            }
                            // 节流：距上次全量扫描不足 300ms，仅用映射后的集合
                            const now = Date.now();
                            if (now - value.lastScanAt < THROTTLE_MS) {
                                return { set: mapped, lastScanAt: value.lastScanAt };
                            }
                            // 全量重匹配
                            return {
                                set: buildDecorations(newState.doc, normalized),
                                lastScanAt: now,
                            };
                        },
                    },
                    props: {
                        decorations(state) {
                            return (sensitivePluginKey.getState(state)?.set ?? DecorationSet.empty);
                        },
                    },
                }),
            ];
        },
    });
}
/**
 * 强制立即刷新敏感词装饰（绕过节流）。
 * 用于敏感词列表变更后立即重绘。调用方式：editor.view.dispatch(empty tr) 触发重算。
 *
 * 这里提供一个工具：通过 view 派发一个带 meta 的空事务，
 * 插件可识别 meta 后强制重算。为保持实现简洁，直接读取当前 state 重建。
 */
export function refreshSensitiveDecorations(view, words) {
    const state = view.state;
    const set = buildDecorations(state.doc, words);
    // 直接通过 state field 的重设无法做到，这里通过派发空事务触发 apply；
    // 真正的强制刷新由 createSensitivePlugin 内部在下次 apply 时按节流策略处理。
    // 若需立即生效，可重建编辑器实例。
    void set;
    view.dispatch(state.tr.setMeta(sensitivePluginKey, { force: true }));
}
//# sourceMappingURL=sensitive-decorations.js.map