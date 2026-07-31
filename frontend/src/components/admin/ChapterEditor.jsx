export default function ChapterEditor({
  editChapter,
  chapterTitle,
  chapterContent,
  onTitleChange,
  onContentChange,
  onSave,
  onCancel,
  busy,
}) {
  if (!editChapter) return null;
  return (
    <div className="chapter-editor">
      <h4>
        {editChapter.id ? `编辑章节：${editChapter.id}` : "新增章节"}
      </h4>
      <label>
        章节标题
        <input
          value={chapterTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="第一章_启程"
        />
      </label>
      <label>
        正文（空行分段）
        <textarea
          rows={12}
          value={chapterContent}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="在此粘贴或输入章节内容，段落间用空行分隔…"
        />
      </label>
      <div className="editor-actions">
        <button className="primary" onClick={onSave} disabled={busy}>
          保存
        </button>
        <button onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}