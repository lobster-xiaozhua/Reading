import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * P2-20 · ContentReview 内容审核流程
 * items[] + mode single/batch + history Timeline + onApprove/onReject/onRevise
 * 驳回必填原因分类 + 说明 ≥10 字；批量模式底部 BatchActionBar
 * Source: 04 §6.20
 * ============================================================ */
import { forwardRef, useMemo, useState } from "react";
import { Card, Space, Button, Input, Select, Timeline, Empty, Tag, Tooltip, } from "antd";
import { splitContentBySensitive, SENSITIVE_LEVEL_META, } from "../data-model/sensitive-filter.js";
const { TextArea } = Input;
const REJECT_REASON_OPTIONS = [
    { label: "涉政", value: "political" },
    { label: "涉黄", value: "pornographic" },
    { label: "暴力", value: "violence" },
    { label: "抄袭", value: "plagiarism" },
    { label: "广告", value: "advertisement" },
    { label: "其他", value: "other" },
];
function getSensitiveColor(level) {
    switch (level) {
        case 1:
            return "var(--color-feedback-error)";
        case 2:
            return "var(--color-feedback-warning)";
        case 3:
        default:
            return "var(--color-text-tertiary)";
    }
}
/** 将 hits 去重为 {text, level} 词表（用于 Tag 清单） */
function dedupeHitsToWords(hits) {
    const seen = new Set();
    const out = [];
    for (const h of hits) {
        const key = `${h.text}|${h.level}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push({ text: h.text, level: h.level });
    }
    return out;
}
/**
 * P8-1-5 正文内敏感词高亮渲染。
 * - 提供 sensitiveHits 时：strip HTML → splitContentBySensitive → 命中段 <span> + Tooltip
 * - 否则回退 dangerouslySetInnerHTML
 */
function ContentPreview({ content, hits, }) {
    const segments = useMemo(() => {
        if (!hits || hits.length === 0)
            return null;
        // 偏移基于纯文本，需先剥 HTML
        const plain = content.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
        return splitContentBySensitive(plain, hits);
    }, [content, hits]);
    if (!segments) {
        return _jsx("div", { dangerouslySetInnerHTML: { __html: content } });
    }
    return (_jsx(_Fragment, { children: segments.map((seg, idx) => seg.isHit && seg.hit ? (_jsx(Tooltip, { title: `${SENSITIVE_LEVEL_META[seg.hit.level].label}：${seg.hit.suggestion ?? SENSITIVE_LEVEL_META[seg.hit.level].defaultSuggestion}`, children: _jsx("span", { style: {
                    background: SENSITIVE_LEVEL_META[seg.hit.level].bg,
                    color: SENSITIVE_LEVEL_META[seg.hit.level].color,
                    borderRadius: "var(--radius-xs, 2px)",
                    padding: "0 2px",
                    textDecoration: "underline wavy",
                    textDecorationColor: SENSITIVE_LEVEL_META[seg.hit.level].color,
                    cursor: "help",
                }, children: seg.text }) }, idx)) : (_jsx("span", { children: seg.text }, idx))) }));
}
function getTimelineColor(result) {
    switch (result) {
        case "approve":
            return "green";
        case "reject":
            return "red";
        case "revise":
            return "blue";
    }
}
function getResultLabel(result) {
    switch (result) {
        case "approve":
            return "通过";
        case "reject":
            return "驳回";
        case "revise":
            return "待修改";
    }
}
/**
 * B 端内容审核流程组件
 * - 单条/批量模式
 * - 驳回必填原因分类 + 说明 ≥10 字
 * - 审核历史 Timeline
 */
export const BContentReview = forwardRef(function BContentReview({ item, items = [], mode = "single", history = [], onApprove, onRevise, onReject, }, ref) {
    const [comment, setComment] = useState("");
    const [rejectReason, setRejectReason] = useState();
    const [submitting, setSubmitting] = useState(false);
    const currentItems = mode === "batch" ? items : item ? [item] : [];
    const currentIds = currentItems.map((i) => i.id);
    const validateReject = () => {
        if (!rejectReason)
            return false;
        return comment.trim().length >= 10;
    };
    const handleApprove = async () => {
        setSubmitting(true);
        try {
            await onApprove?.(currentIds, comment);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleRevise = async () => {
        setSubmitting(true);
        try {
            await onRevise?.(currentIds, comment);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleReject = async () => {
        if (!validateReject())
            return;
        setSubmitting(true);
        try {
            await onReject?.(currentIds, rejectReason, comment);
        }
        finally {
            setSubmitting(false);
        }
    };
    const canReject = validateReject();
    return (_jsxs("div", { ref: ref, className: "b-content-review", children: [_jsx(Card, { title: `内容预览${mode === "batch" ? `（${currentItems.length} 条）` : ""}`, style: { marginBottom: "var(--space-4)" }, children: currentItems.length === 0 ? (_jsx(Empty, { description: "\u65E0\u5F85\u5BA1\u5185\u5BB9" })) : (currentItems.map((it) => {
                    // P8-1-5：若提供 sensitiveHits 但未提供 sensitiveWords，则从 hits 派生 Tag 清单
                    const tagWords = it.sensitiveWords && it.sensitiveWords.length > 0
                        ? it.sensitiveWords
                        : it.sensitiveHits && it.sensitiveHits.length > 0
                            ? dedupeHitsToWords(it.sensitiveHits)
                            : [];
                    return (_jsxs("div", { style: { marginBottom: "var(--space-4)" }, children: [_jsxs("h3", { style: {
                                    fontSize: "var(--font-size-h3, 20px)",
                                    fontWeight: 600,
                                    marginBottom: "var(--space-2)",
                                }, children: [it.title, _jsxs("span", { style: {
                                            fontSize: "var(--font-size-body, 14px)",
                                            color: "var(--color-text-secondary)",
                                            marginLeft: "var(--space-2)",
                                        }, children: ["\u4F5C\u8005\uFF1A", it.author] })] }), tagWords.length > 0 && (_jsxs("div", { style: { marginBottom: "var(--space-2)" }, children: [_jsx("span", { style: {
                                            color: "var(--color-text-secondary)",
                                            marginRight: "var(--space-2)",
                                        }, children: "\u654F\u611F\u8BCD\uFF1A" }), tagWords.map((sw, idx) => (_jsx(Tag, { style: {
                                            color: getSensitiveColor(sw.level),
                                            borderColor: getSensitiveColor(sw.level),
                                        }, children: sw.text }, idx)))] })), _jsx("div", { className: "b-content-review__content", style: {
                                    background: "var(--color-bg-subtle)",
                                    borderRadius: "var(--radius-md, 8px)",
                                    padding: "var(--space-4)",
                                    maxHeight: 400,
                                    overflowY: "auto",
                                    lineHeight: 1.8,
                                    fontSize: "var(--font-size-body, 14px)",
                                }, children: _jsx(ContentPreview, { content: it.content, hits: it.sensitiveHits }) })] }, it.id));
                })) }), history.length > 0 && (_jsx(Card, { title: "\u5BA1\u6838\u5386\u53F2", style: { marginBottom: "var(--space-4)" }, children: _jsx(Timeline, { items: history.map((h) => ({
                        color: getTimelineColor(h.result),
                        children: (_jsxs("div", { children: [_jsxs("div", { style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "var(--space-2)",
                                    }, children: [_jsx(Tag, { color: h.result === "approve"
                                                ? "success"
                                                : h.result === "reject"
                                                    ? "error"
                                                    : "processing", children: getResultLabel(h.result) }), _jsxs("span", { style: {
                                                color: "var(--color-text-secondary)",
                                                fontSize: "var(--font-size-caption, 13px)",
                                            }, children: [h.operator, " \u00B7 ", h.time] })] }), h.comment && (_jsx("p", { style: {
                                        marginTop: "var(--space-1)",
                                        color: "var(--color-text-primary)",
                                    }, children: h.comment }))] })),
                    })) }) })), _jsx(Card, { title: "\u5BA1\u6838\u64CD\u4F5C", children: _jsxs("div", { style: {
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-3)",
                    }, children: [_jsxs("div", { style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--space-2)",
                            }, children: [_jsx("label", { style: {
                                        color: "var(--color-text-secondary)",
                                        whiteSpace: "nowrap",
                                    }, children: "\u9A73\u56DE\u539F\u56E0\uFF1A" }), _jsx(Select, { value: rejectReason, onChange: setRejectReason, options: REJECT_REASON_OPTIONS, placeholder: "\u9009\u62E9\u9A73\u56DE\u539F\u56E0\uFF08\u9A73\u56DE\u65F6\u5FC5\u586B\uFF09", style: { width: 200 }, allowClear: true })] }), _jsx(TextArea, { value: comment, onChange: (e) => setComment(e.target.value), placeholder: "\u5BA1\u6838\u610F\u89C1\uFF08\u9A73\u56DE\u65F6\u9700 \u226510 \u5B57\uFF09", rows: 3, maxLength: 500, showCount: true }), _jsxs(Space, { children: [_jsx(Button, { type: "primary", loading: submitting, onClick: handleApprove, disabled: currentIds.length === 0, children: "\u901A\u8FC7" }), _jsx(Button, { loading: submitting, onClick: handleRevise, disabled: currentIds.length === 0, children: "\u5F85\u4FEE\u6539" }), _jsx(Button, { danger: true, loading: submitting, onClick: handleReject, disabled: !canReject || currentIds.length === 0, children: "\u9A73\u56DE" })] })] }) })] }));
});
//# sourceMappingURL=BContentReview.js.map