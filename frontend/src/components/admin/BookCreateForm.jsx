import ImportDropZone from "../ImportDropZone.jsx";

export default function BookCreateForm({
  newId,
  newTitle,
  newAuthor,
  newDesc,
  newTags,
  onNewIdChange,
  onNewTitleChange,
  onNewAuthorChange,
  onNewDescChange,
  onNewTagsChange,
  onCreate,
  batchFiles,
  onBatchFilesChange,
  onBatchImport,
  batchProgress,
  failedFiles,
  onRetryFailed,
  busy,
}) {
  return (
    <section className="admin-create">
      <h2>新建书籍</h2>
      <form onSubmit={onCreate} className="admin-form">
        <div className="form-row">
          <label>
            文件夹名(book_id)
            <input value={newId} onChange={(e) => onNewIdChange(e.target.value)} placeholder="留空则用书名，如 xinghai" />
          </label>
          <label>
            书名 *
            <input value={newTitle} onChange={(e) => onNewTitleChange(e.target.value)} placeholder="星海拾遗" />
          </label>
        </div>
        <div className="form-row">
          <label>
            作者
            <input value={newAuthor} onChange={(e) => onNewAuthorChange(e.target.value)} placeholder="墨白" />
          </label>
          <label>
            简介
            <input value={newDesc} onChange={(e) => onNewDescChange(e.target.value)} placeholder="一句话简介" />
          </label>
        </div>
        <div className="form-row">
          <label>
            标签（逗号分隔，如 玄幻,热血）
            <input value={newTags} onChange={(e) => onNewTagsChange(e.target.value)} placeholder="玄幻, 热血" />
          </label>
        </div>
        <button type="submit" className="primary" disabled={busy}>创建书籍</button>
      </form>

      <div className="batch-import">
        <h3>批量导入（多本 txt / zip）</h3>
        <p className="admin-hint">每个 .txt 文件名作为书名，自动建书并分章。已存在的同名书会跳过。支持 .zip 压缩包。</p>
        <ImportDropZone onFiles={onBatchFilesChange} busy={busy} />
        {batchFiles.length > 0 && (
          <div className="batch-preview">
            已选择 {batchFiles.length} 个文件：
            {batchFiles.map((f) => (
              <span key={f.name} className="tag-chip">{f.name}</span>
            ))}
          </div>
        )}
        <button className="primary" disabled={busy || !batchFiles.length} onClick={onBatchImport}>
          开始批量导入
        </button>
        {failedFiles.length > 0 && (
          <button className="btn btn-secondary" onClick={onRetryFailed} disabled={busy} style={{ marginLeft: "8px" }}>
            重试失败项 ({failedFiles.length})
          </button>
        )}
        {batchProgress.total > 0 && (
          <div className="batch-progress">
            <div className="batch-progress-bar">
              进度：{batchProgress.done} / {batchProgress.total}（成功 {batchProgress.success}，失败 {batchProgress.failed}）
              {batchProgress.current && <span> — 当前：{batchProgress.current}</span>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}