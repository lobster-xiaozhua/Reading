import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { addHighlight, getHighlights, removeHighlight } from "../lib/localLibrary.js";

const COLORS = [
  { id: "yellow", bg: "rgba(255, 200, 0, 0.35)", label: "黄" },
  { id: "green", bg: "rgba(74, 222, 128, 0.35)", label: "绿" },
  { id: "blue", bg: "rgba(96, 165, 250, 0.35)", label: "蓝" },
  { id: "pink", bg: "rgba(244, 114, 182, 0.35)", label: "粉" },
];

// 颜色缓存 — 模块级常量，避免每次渲染重建
const COLOR_BG_CACHE = Object.fromEntries(COLORS.map((c) => [c.id, c.bg]));

const TOOLTIP_DISMISS_DELAY = 200;

export default function ReaderHighlight({
  bookId,
  chapterId,
  scrollRef,
  fontSize,
  lineHeight,
  children,
}) {
  const [tooltip, setTooltip] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const lastSelection = useRef(null);
  const dismissTimerRef = useRef(null);

  // 加载已有的划线
  useEffect(() => {
    setHighlights(getHighlights(bookId, chapterId));
  }, [bookId, chapterId]);

  // 构建高亮查找映射：text -> highlights[]
  // 避免每次渲染时线性扫描全部段落
  const highlightMap = useMemo(() => {
    const map = new Map();
    for (const h of highlights) {
      if (!map.has(h.text)) {
        map.set(h.text, []);
      }
      map.get(h.text).push(h);
    }
    return map;
  }, [highlights]);

  const getColorBg = (colorId) => COLOR_BG_CACHE[colorId] || "rgba(255, 200, 0, 0.35)";

  // 将段落文本拆分为普通文本和高亮片段（使用 Map 查找，O(1)）
  const renderParagraph = useCallback((text, pIdx) => {
    // 快速检查：遍历 map 的 key 看是否包含（仅当有高亮时）
    let hasHighlight = false;
    for (const key of highlightMap.keys()) {
      if (text.includes(key)) {
        hasHighlight = true;
        break;
      }
    }
    if (!hasHighlight) return text;

    // 按高亮文本拆分
    // 按长度降序排列，避免短文本盖住长文本
    const sortedKeys = [...highlightMap.keys()]
      .filter((k) => text.includes(k))
      .sort((a, b) => b.length - a.length);

    if (sortedKeys.length === 0) return text;

    const key = sortedKeys[0];
    const h = highlightMap.get(key)[0];
    const color = getColorBg(h.color);
    const parts = text.split(key);

    return parts.reduce((acc, part, i) => {
      acc.push(part);
      if (i < parts.length - 1) {
        acc.push(
          <span
            key={`hl-${pIdx}-${h.id}`}
            className="reader-highlight-text"
            style={{ background: color, borderRadius: "2px", cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              setTooltip({
                x: e.clientX,
                y: e.clientY,
                highlights: [h],
                text: h.text,
              });
            }}
          >
            {h.text}
          </span>
        );
      }
      return acc;
    }, []);
  }, [highlightMap]);

  // 清理 tooltip 延迟关闭定时器
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  // 处理文本选中
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      // 延迟以允许点击划线上的 tooltip
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        if (!lastSelection.current) setTooltip(null);
        dismissTimerRef.current = null;
      }, TOOLTIP_DISMISS_DELAY);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 2 || text.length > 200) {
      sel.removeAllRanges();
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      text,
      range,
    });
    lastSelection.current = { text, range };
  }, []);

  const handleHighlight = useCallback(
    (color = "yellow") => {
      if (!lastSelection.current) return;
      const { text } = lastSelection.current;
      addHighlight({ bookId, chapterId, text, color });
      setHighlights(getHighlights(bookId, chapterId));
      setTooltip(null);
      window.getSelection()?.removeAllRanges();
      lastSelection.current = null;
    },
    [bookId, chapterId]
  );

  const handleRemoveHighlight = useCallback(
    (highlightId) => {
      removeHighlight(bookId, chapterId, highlightId);
      setHighlights(getHighlights(bookId, chapterId));
      setTooltip(null);
    },
    [bookId, chapterId]
  );

  const closeTooltip = useCallback(() => {
    setTooltip(null);
    lastSelection.current = null;
  }, []);

  return (
    <div className="reader-highlight-wrapper" onMouseUp={handleMouseUp}>
      {children({ renderParagraph })}

      {/* 划线 tooltip */}
      {tooltip && (
        <>
          <div className="reader-hl-overlay" onClick={closeTooltip} />
          <div
            className="reader-hl-tooltip"
            style={{
              left: Math.min(tooltip.x, window.innerWidth - 200),
              top: tooltip.y,
            }}
          >
            {tooltip.highlights ? (
              <div className="reader-hl-actions">
                <span className="reader-hl-text-preview">{tooltip.text.slice(0, 30)}</span>
                {tooltip.highlights.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="reader-hl-remove-btn"
                    onClick={() => handleRemoveHighlight(h.id)}
                    title="删除划线"
                  >
                    ✕ 删除划线
                  </button>
                ))}
              </div>
            ) : (
              <div className="reader-hl-actions">
                <span className="reader-hl-label">划线颜色</span>
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="reader-hl-color-btn"
                    style={{ background: c.bg, border: "2px solid transparent" }}
                    onClick={() => handleHighlight(c.id)}
                    title={c.label}
                    aria-label={`${c.label}色划线`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}