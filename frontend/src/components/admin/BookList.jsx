export default function BookList({
  books,
  activeBook,
  editingBook,
  busy,
  onOpenChapters,
  onStartEditInfo,
  onEditingBookChange,
  onSaveEditInfo,
  onCancelEditInfo,
  onRename,
  onDelete,
}) {
  return (
    <section className="admin-list">
      <h2>已有书籍（{books.length}）</h2>
      <div className="admin-overview">
        <div className="overview-card">书籍总数：{books.length}</div>
        <div className="overview-card">章节总数：{books.reduce((sum, b) => sum + (b.chapter_count || 0), 0)}</div>
        <div className="overview-card">总字数：{books.reduce((sum, b) => sum + (b.word_count || 0), 0).toLocaleString()}</div>
        <div className="overview-card">最近更新：{books.length ? (books.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0]?.updated_at || "无") : "无"}</div>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>书名</th>
            <th>作者</th>
            <th>章节数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => (
            <tr key={b.id}>
              <td>{b.title}</td>
              <td>{b.author}</td>
              <td>{b.chapter_count}</td>
              <td className="row-actions">
                <button onClick={() => onOpenChapters(b)}>
                  {activeBook === b.id ? "收起章节" : "章节管理"}
                </button>
                <button onClick={() => onStartEditInfo(b)}>编辑信息</button>
                {editingBook && editingBook.id === b.id && (
                  <div className="inline-edit-form">
                    <label>书名 <input value={editingBook.title} onChange={e => onEditingBookChange({ ...editingBook, title: e.target.value })} /></label>
                    <label>作者 <input value={editingBook.author} onChange={e => onEditingBookChange({ ...editingBook, author: e.target.value })} /></label>
                    <label>简介 <input value={editingBook.description} onChange={e => onEditingBookChange({ ...editingBook, description: e.target.value })} /></label>
                    <div className="editor-actions">
                      <button className="primary" onClick={onSaveEditInfo} disabled={busy}>保存</button>
                      <button onClick={onCancelEditInfo}>取消</button>
                    </div>
                  </div>
                )}
                <button onClick={() => onRename(b)}>重命名</button>
                <button className="danger" onClick={() => onDelete(b)}>
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}