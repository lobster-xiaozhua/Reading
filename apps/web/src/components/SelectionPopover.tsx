/* ============================================================
 * SelectionPopover · 阅读器选词操作浮层
 * 监听文本选中事件，在选中区域上方弹出操作菜单
 * 支持：添加笔记、划线标记
 * ============================================================ */
import { useCallback, useEffect, useState } from 'react';
import { fetcher } from '@/api/fetcher';
import { NavigationClose } from '@novel/icons';
import './SelectionPopover.css';

interface SelectionPopoverProps {
  bookId: string;
  chapterId: string;
}

type Action = 'note' | 'highlight';

export function SelectionPopover({ bookId, chapterId }: SelectionPopoverProps) {
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSelection = useCallback(() => {
    if (activeAction) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setAnchor(null);
      setSelectedText('');
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 2 || text.length > 500) {
      setAnchor(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setAnchor({
      top: rect.top - 48,
      left: rect.left + rect.width / 2,
    });
    setSelectedText(text);
  }, [activeAction]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [handleSelection]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setAnchor(null);
    setSelectedText('');
    setActiveAction(null);
    setNoteText('');
  }, []);

  const handleNote = useCallback(() => {
    setActiveAction('note');
  }, []);

  const handleHighlight = useCallback(async () => {
    if (!selectedText) return;
    setSaving(true);
    try {
      await fetcher.createNote({
        bookId,
        chapterId,
        text: selectedText,
      });
    } catch {
      // 静默失败
    } finally {
      setSaving(false);
      clearSelection();
    }
  }, [selectedText, bookId, chapterId, clearSelection]);

  const handleSaveNote = useCallback(async () => {
    if (!selectedText) return;
    setSaving(true);
    try {
      await fetcher.createNote({
        bookId,
        chapterId,
        text: selectedText,
        annotation: noteText,
      });
      clearSelection();
    } catch {
      // 静默失败
    } finally {
      setSaving(false);
    }
  }, [selectedText, noteText, bookId, chapterId, clearSelection]);

  const handleCancelNote = useCallback(() => {
    setActiveAction(null);
    setNoteText('');
  }, []);

  if (!anchor) return null;

  return (
    <div
      className="selection-popover"
      style={{ top: `${anchor.top}px`, left: `${anchor.left}px` }}
    >
      {activeAction === 'note' ? (
        <div className="selection-popover__note">
          <div className="selection-popover__quote">
            &ldquo;{selectedText.slice(0, 30)}{selectedText.length > 30 ? '...' : ''}&rdquo;
          </div>
          <textarea
            autoFocus
            className="selection-popover__textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="输入笔记内容..."
            rows={3}
          />
          <div className="selection-popover__actions">
            <button
              type="button"
              className="selection-popover__btn selection-popover__btn--ghost"
              onClick={handleCancelNote}
            >
              取消
            </button>
            <button
              type="button"
              className="selection-popover__btn selection-popover__btn--primary"
              onClick={handleSaveNote}
              disabled={saving}
            >
              保存笔记
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="selection-popover__btn"
            onClick={handleNote}
          >
            添加笔记
          </button>
          <button
            type="button"
            className="selection-popover__btn"
            onClick={handleHighlight}
            disabled={saving}
          >
            划线标记
          </button>
          <button
            type="button"
            className="selection-popover__close"
            onClick={clearSelection}
            aria-label="关闭"
          >
            <NavigationClose size="xs" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}