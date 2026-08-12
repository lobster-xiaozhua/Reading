import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* ============================================================
 * ReadingProgress · 03 §6.11
 * 阅读器顶部进度条：
 *   - 2px 细条 brand-7 填充，不挤压正文
 *   - 桌面端可拖拽 8px 圆点 seek，H5 仅展示
 *   - 「第 N 章 / 共 M 章」font-sans 12px text-tertiary
 *   - 章节切换进度归零 dur-normal 240ms 重置
 *   - 满 100% + 「本章已读完」提示
 * ============================================================ */
import { useCallback, useEffect, useRef, useState, } from "react";
export function ReadingProgress({ current, total, percent, showChapter = true, onSeek, disableSeek = false, className, }) {
    const trackRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [dragChapter, setDragChapter] = useState(null);
    const clamped = Math.max(0, Math.min(100, percent));
    const isComplete = clamped >= 100;
    const seekable = !!onSeek && !disableSeek;
    /* ---------- 计算拖拽位置对应章节 ---------- */
    const calcChapter = useCallback((clientX) => {
        const track = trackRef.current;
        if (!track)
            return current;
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.max(1, Math.min(total, Math.ceil(ratio * total)));
    }, [current, total]);
    /* ---------- 拖拽处理 ---------- */
    useEffect(() => {
        if (!seekable)
            return;
        if (!dragging)
            return;
        const handleMove = (e) => {
            const ch = calcChapter(e.clientX);
            setDragChapter(ch);
        };
        const handleUp = (e) => {
            const ch = calcChapter(e.clientX);
            setDragging(false);
            setDragChapter(null);
            onSeek?.(ch);
        };
        document.addEventListener("pointermove", handleMove);
        document.addEventListener("pointerup", handleUp);
        return () => {
            document.removeEventListener("pointermove", handleMove);
            document.removeEventListener("pointerup", handleUp);
        };
    }, [seekable, dragging, calcChapter, onSeek]);
    const handleTrackPointerDown = (e) => {
        if (!seekable)
            return;
        const ch = calcChapter(e.clientX);
        setDragging(true);
        setDragChapter(ch);
    };
    /* ---------- 显示用进度：拖拽时跟随手柄 ---------- */
    const displayPercent = dragging && dragChapter != null ? (dragChapter / total) * 100 : clamped;
    const fillStyle = {
        width: `${displayPercent}%`,
        transition: dragging
            ? "none"
            : "width var(--dur-normal) var(--ease-standard)",
    };
    const rootCls = [
        "novel-reading-progress",
        dragging ? "is-dragging" : "",
        isComplete ? "is-complete" : "",
        seekable ? "is-seekable" : "",
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    return (_jsxs("div", { className: rootCls, children: [_jsxs("div", { ref: trackRef, className: "novel-reading-progress__track", onPointerDown: handleTrackPointerDown, role: seekable ? "slider" : undefined, "aria-valuemin": 1, "aria-valuemax": total, "aria-valuenow": dragging ? (dragChapter ?? current) : current, "aria-label": "\u7AE0\u8282\u8FDB\u5EA6", tabIndex: seekable ? 0 : undefined, onKeyDown: seekable
                    ? (e) => {
                        if (e.key === "ArrowLeft" && current > 1)
                            onSeek?.(current - 1);
                        else if (e.key === "ArrowRight" && current < total)
                            onSeek?.(current + 1);
                    }
                    : undefined, children: [_jsx("div", { className: "novel-reading-progress__fill", style: fillStyle }), seekable ? (_jsx("div", { className: "novel-reading-progress__handle", style: {
                            left: `${displayPercent}%`,
                            transition: dragging
                                ? "none"
                                : "left var(--dur-normal) var(--ease-standard)",
                        }, "aria-hidden": true })) : null, dragging && dragChapter != null ? (_jsxs("div", { className: "novel-reading-progress__bubble", style: { left: `${displayPercent}%` }, role: "tooltip", children: ["\u7B2C ", dragChapter, " \u7AE0"] })) : null] }), showChapter ? (_jsxs("div", { className: "novel-reading-progress__info", children: [_jsxs("span", { className: "novel-reading-progress__chapter", children: ["\u7B2C ", current, " \u7AE0 / \u5171 ", total, " \u7AE0"] }), isComplete ? (_jsx("span", { className: "novel-reading-progress__done", children: "\u672C\u7AE0\u5DF2\u8BFB\u5B8C" })) : null] })) : null] }));
}
//# sourceMappingURL=ReadingProgress.js.map