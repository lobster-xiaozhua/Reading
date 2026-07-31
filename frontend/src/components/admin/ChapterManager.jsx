import ChapterEditor from "./ChapterEditor.jsx";

export default function ChapterManager({
  activeDetail,
  activeBook,
  busy,
  chapterTitle,
  chapterContent,
  importText,
  tagInput,
  editChapter,
  onStartNewChapter,
  onStartEditChapter,
  onSaveChapter,
  onDeleteChapter,
  onChapterTitleChange,
  onChapterContentChange,
  onCancelEdit,
  onImportTextChange,
  onImportFileChange,
  onImportFull,
  onUploadCover,
  onTagInputChange,
  onSaveTags,
  onReorder,
  onError,
}) {
  if (!activeDetail) return null;

  return (
    <div className="chapter-panel">
      <div className="chapter-panel-head">
        <h3>《{activeDetail.title}》章节</h3>
        <button className="primary" onClick={onStartNewChapter}>
          + 新增章节
        </button>
      </div>
      <ul
        className="chapter-admin-list drag-sort-list"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
      >
        {activeDetail.chapters.map((c, index) => (
          <li
            key={c.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", String(index));
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
              const toIndex = index;
              if (fromIndex === toIndex) return;
              const newChapters = [...activeDetail.chapters];
              const [moved] = newChapters.splice(fromIndex, 1);
              newChapters.splice(toIndex, 0, moved);
              onReorder(newChapters);
            }}
          >
            <span className="drag-handle" title="拖拽排序">☰</span>
            <span>{c.title}</span>
            <span className="row-actions">
              <button onClick={() => onStartEditChapter(c)}>编辑</button>
              <button className="danger" onClick={() => onDeleteChapter(c)}>
                删除
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="book-tools">
        <div className="tool-block">
          <h4>整本上传（自动分章）</h4>
          <p className="admin-hint">
            粘贴全文，或选择 .txt 文件。系统自动按「第X章/Chapter
            X」等标记切分；识别不到则整本作为一章。
          </p>
          <textarea
            rows={6}
            value={importText}
            onChange={(e) => onImportTextChange(e.target.value)}
            placeholder="在此粘贴整本小说文本…"
          />
          <div className="editor-actions">
            <input type="file" accept=".txt" onChange={onImportFileChange} />
            <button
              className="primary"
              onClick={onImportFull}
              disabled={busy}
            >
              导入并分章
            </button>
          </div>
        </div>

        <div className="tool-block">
          <h4>封面预览</h4>
          {activeDetail.cover ? (
            <div className="cover-preview enhanced">
              <img
                src={`/api/cover/${encodeURIComponent(activeBook)}`}
                alt="封面预览"
                onClick={() => window.open(`/api/cover/${encodeURIComponent(activeBook)}`, "_blank")}
                title="点击在新窗口查看原图"
              />
              <p className="cover-hint">点击图片查看原图</p>
            </div>
          ) : (
            <div className="cover-preview enhanced empty">
              <span>暂无封面</span>
              <p className="cover-hint">上传封面后可在此预览并点击查看原图</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onUploadCover}
          />
        </div>

        <div className="tool-block">
          <h4>标签</h4>
          <div className="tag-list">
            {(activeDetail.tags || []).map((t) => (
              <span key={t} className="tag-chip active">
                {t}
              </span>
            ))}
            {(!activeDetail.tags || activeDetail.tags.length === 0) && (
              <span className="admin-hint">暂无标签</span>
            )}
          </div>
          <div className="editor-actions">
            <input
              type="text"
              placeholder="玄幻, 热血"
              value={tagInput}
              onChange={(e) => onTagInputChange(e.target.value)}
            />
            <button className="primary" onClick={onSaveTags} disabled={busy}>
              保存标签
            </button>
          </div>
        </div>
      </div>

      <ChapterEditor
        editChapter={editChapter}
        chapterTitle={chapterTitle}
        chapterContent={chapterContent}
        onTitleChange={onChapterTitleChange}
        onContentChange={onChapterContentChange}
        onSave={onSaveChapter}
        onCancel={onCancelEdit}
        busy={busy}
      />
    </div>
  );
}