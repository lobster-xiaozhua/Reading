/* ============================================================
 * ReadingProgress · 03 §6.11
 * 阅读器顶部进度条：
 *   - 2px 细条 brand-7 填充，不挤压正文
 *   - 桌面端可拖拽 8px 圆点 seek，H5 仅展示
 *   - 「第 N 章 / 共 M 章」font-sans 12px text-tertiary
 *   - 章节切换进度归零 dur-normal 240ms 重置
 *   - 满 100% + 「本章已读完」提示
 * ============================================================ */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

export interface ReadingProgressProps {
  /** 当前章节序号（1-based） */
  current: number;
  /** 总章节数 */
  total: number;
  /** 当前章节内进度 0-100 */
  percent: number;
  /** 是否显示章节信息「第 N 章 / 共 M 章」，默认 true */
  showChapter?: boolean;
  /** 拖拽/点击跳转章节（章节序号 1-based）；未提供时 H5 只读模式 */
  onSeek?: (chapter: number) => void;
  /** 是否禁用拖拽（H5 默认禁用，桌面可启用），默认 false */
  disableSeek?: boolean;
  className?: string;
}

export function ReadingProgress({
  current,
  total,
  percent,
  showChapter = true,
  onSeek,
  disableSeek = false,
  className,
}: ReadingProgressProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragChapter, setDragChapter] = useState<number | null>(null);

  const clamped = Math.max(0, Math.min(100, percent));
  const isComplete = clamped >= 100;

  const seekable = !!onSeek && !disableSeek;

  /* ---------- 计算拖拽位置对应章节 ---------- */
  const calcChapter = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return current;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.max(1, Math.min(total, Math.ceil(ratio * total)));
    },
    [current, total],
  );

  /* ---------- 拖拽处理 ---------- */
  useEffect(() => {
    if (!seekable) return;
    if (!dragging) return;

    const handleMove = (e: PointerEvent) => {
      const ch = calcChapter(e.clientX);
      setDragChapter(ch);
    };
    const handleUp = (e: PointerEvent) => {
      const ch = calcChapter(e.clientX);
      setDragging(false);
      setDragChapter(null);
      onSeek?.(ch);
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [seekable, dragging, calcChapter, onSeek]);

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!seekable) return;
    const ch = calcChapter(e.clientX);
    setDragging(true);
    setDragChapter(ch);
  };

  /* ---------- 显示用进度：拖拽时跟随手柄 ---------- */
  const displayPercent = dragging && dragChapter != null
    ? (dragChapter / total) * 100
    : clamped;

  const fillStyle: CSSProperties = {
    width: `${displayPercent}%`,
    transition: dragging
      ? 'none'
      : 'width var(--dur-normal) var(--ease-standard)',
  };

  const rootCls = [
    'novel-reading-progress',
    dragging ? 'is-dragging' : '',
    isComplete ? 'is-complete' : '',
    seekable ? 'is-seekable' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootCls}>
      <div
        ref={trackRef}
        className="novel-reading-progress__track"
        onPointerDown={handleTrackPointerDown}
        role={seekable ? 'slider' : undefined}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={dragging ? dragChapter ?? current : current}
        aria-label="章节进度"
        tabIndex={seekable ? 0 : undefined}
        onKeyDown={
          seekable
            ? (e) => {
                if (e.key === 'ArrowLeft' && current > 1) onSeek?.(current - 1);
                else if (e.key === 'ArrowRight' && current < total) onSeek?.(current + 1);
              }
            : undefined
        }
      >
        <div className="novel-reading-progress__fill" style={fillStyle} />
        {seekable ? (
          <div
            className="novel-reading-progress__handle"
            style={{
              left: `${displayPercent}%`,
              transition: dragging ? 'none' : 'left var(--dur-normal) var(--ease-standard)',
            }}
            aria-hidden
          />
        ) : null}
        {/* 拖拽预览气泡 */}
        {dragging && dragChapter != null ? (
          <div
            className="novel-reading-progress__bubble"
            style={{ left: `${displayPercent}%` }}
            role="tooltip"
          >
            第 {dragChapter} 章
          </div>
        ) : null}
      </div>
      {showChapter ? (
        <div className="novel-reading-progress__info">
          <span className="novel-reading-progress__chapter">
            第 {current} 章 / 共 {total} 章
          </span>
          {isComplete ? (
            <span className="novel-reading-progress__done">本章已读完</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
