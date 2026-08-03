/* ============================================================
 * SelectionPopover · 阅读器选词操作浮层
 * 监听文本选中事件，在选中区域上方弹出操作菜单
 * 支持：添加笔记、划线标记
 * ============================================================ */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetcher } from '@/api/fetcher';

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
  const popoverRef = useRef<HTMLDivElement>(null);

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
      top: rect.top - 8,
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
        annotation: '',
        paragraphIndex: 0,
        offsetStart: 0,
        offsetEnd: 0,
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
        paragraphIndex: 0,
        offsetStart: 0,
        offsetEnd: 0,
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
      ref={popoverRef}
      className="selection-popover"
      style={{
        position: 'fixed',
        top: `${anchor.top - 48}px`,
        left: `${anchor.left}px`,
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'var(--color-bg-elevated, #333)',
        borderRadius: 'var(--radius-md, 8px)',
        boxShadow: 'var(--sh-3, 0 4px 12px rgba(0,0,0,0.3))',
        padding: '4px',
        display: 'flex',
        gap: '2px',
        fontSize: '13px',
      }}
    >
      {activeAction === 'note' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px', minWidth: '200px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, #999)', marginBottom: '2px' }}>
            "{selectedText.slice(0, 30)}{selectedText.length > 30 ? '...' : ''}"
          </div>
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="输入笔记内容..."
            rows={3}
            style={{
              border: '1px solid var(--color-border, #555)',
              borderRadius: '4px',
              padding: '6px',
              fontSize: '13px',
              resize: 'none',
              background: 'var(--color-bg, #222)',
              color: 'var(--color-text, #fff)',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancelNote}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-secondary, #999)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={saving}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: 'none',
                background: 'var(--color-brand, #e74c3c)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: saving ? 0.6 : 1,
              }}
            >
              保存笔记
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleNote}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            添加笔记
          </button>
          <button
            type="button"
            onClick={handleHighlight}
            disabled={saving}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              opacity: saving ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            划线标记
          </button>
          <button
            type="button"
            onClick={clearSelection}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-secondary, #999)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label="关闭"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}