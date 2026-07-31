import { useEffect, useState, useCallback } from "react";
import {
  fetchBooks,
  adminCreateBook,
  adminUpdateBook,
  adminRenameBook,
  adminDeleteBook,
  adminCreateChapter,
  adminUpdateChapter,
  adminDeleteChapter,
  adminImportText,
  adminUploadCover,
  fetchBookDetail,
  adminSetTags,
  adminReorderChapters,
  adminReindex,
  getAdminKey,
  setAdminKey,
  fetchHealth,
  fetchChapter,
  clearCache,
} from "../api.ts";
import { useAuth } from "../auth.jsx";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import BookCreateForm from "../components/admin/BookCreateForm.jsx";
import BookList from "../components/admin/BookList.jsx";
import ChapterManager from "../components/admin/ChapterManager.jsx";
import ImportDropZone from "../components/ImportDropZone.jsx";
import "../styles/_admin.css";

const BATCH_PROGRESS_KEY = "admin_batch_progress";

export default function Admin() {
  const [books, setBooks] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState(() => getAdminKey());
  const [keySavedHint, setKeySavedHint] = useState("");
  const [health, setHealth] = useState(null);
  const [reindexMsg, setReindexMsg] = useState("");

  const [newId, setNewId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTags, setNewTags] = useState("");
  const [batchFiles, setBatchFiles] = useState([]);
  const [failedFiles, setFailedFiles] = useState([]);

  const [activeBook, setActiveBook] = useState(null);
  const [activeDetail, setActiveDetail] = useState(null);

  const [editChapter, setEditChapter] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");

  const DRAFT_KEY = (bookId, chapterId) => `admin_draft:${bookId}:${chapterId || "new"}`;
  const loadDraft = (bookId, chapterId) => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(bookId, chapterId));
      if (raw) {
        const d = JSON.parse(raw);
        if (d.title !== undefined) setChapterTitle(d.title);
        if (d.content !== undefined) setChapterContent(d.content);
      }
    } catch { /* ignore */ }
  };
  const saveDraft = (bookId, chapterId) => {
    try {
      localStorage.setItem(DRAFT_KEY(bookId, chapterId), JSON.stringify({ title: chapterTitle, content: chapterContent }));
    } catch { /* ignore */ }
  };
  const clearDraft = (bookId, chapterId) => {
    try { localStorage.removeItem(DRAFT_KEY(bookId, chapterId)); } catch { /* ignore */ }
  };

  const [importText, setImportText] = useState("");
  const [tagInput, setTagInput] = useState("");

  const [editingBook, setEditingBook] = useState(null);

  const startEditInfo = (book) => {
    setEditingBook({ id: book.id, title: book.title, author: book.author, description: book.description || "", tags: book.tags || [] });
  };
  const cancelEditInfo = () => setEditingBook(null);
  const saveEditInfo = async () => {
    if (!editingBook) return;
    const data = await withBusy(() =>
      adminUpdateBook(editingBook.id, {
        title: editingBook.title,
        author: editingBook.author,
        description: editingBook.description,
        tags: editingBook.tags,
      })
    );
    if (data) {
      setEditingBook(null);
      refresh();
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        if (editingBook) saveEditInfo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editingBook]);

  const refresh = useCallback(async () => {
    clearCache();
    try {
      const data = await fetchBooks();
      setBooks(data);
      return data;
    } catch (e) {
      setError(e.message);
      return [];
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    refresh();
    fetchHealth(ac.signal)
      .then(setHealth)
      .catch(() => setHealth(null));
    return () => ac.abort();
  }, [refresh]);

  const saveAdminKey = () => {
    setAdminKey(adminKeyInput);
    setKeySavedHint(adminKeyInput.trim() ? "密钥已保存到本机浏览器" : "已清除本机密钥");
    setTimeout(() => setKeySavedHint(""), 2500);
  };

  const clearAdminKey = () => {
    setAdminKeyInput("");
    setAdminKey("");
    setKeySavedHint("已清除本机密钥");
    setTimeout(() => setKeySavedHint(""), 2500);
  };

  const runReindex = async () => {
    if (!confirm("从数据库全量重建搜索索引？书多时可能较慢。")) return;
    setReindexMsg("");
    const data = await withBusy(() => adminReindex());
    if (data) {
      setReindexMsg(`重建完成：书籍 ${data.books ?? 0}，章节 ${data.chapters ?? 0}`);
      fetchHealth().then(setHealth).catch(() => {});
    }
  };

  const withBusy = async (fn) => {
    setBusy(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const id = (newId || newTitle).trim();
    if (!id) {
      setError("请填写文件夹名或书名");
      return;
    }
    const data = await withBusy(() =>
      adminCreateBook({
        id,
        title: newTitle.trim() || id,
        author: newAuthor.trim(),
        description: newDesc.trim(),
      })
    );
    if (data) {
      setNewId("");
      setNewTitle("");
      setNewAuthor("");
      setNewDesc("");
      setNewTags("");
      refresh();
    }
  };

  const handleRename = async (book) => {
    const newId = prompt("新的文件夹名（book_id）：", book.id);
    if (!newId || newId === book.id) return;
    const data = await withBusy(() => adminRenameBook(book.id, newId.trim()));
    if (data) refresh();
  };

  const handleDelete = async (book) => {
    const confirmName = prompt(`确定删除《${book.title}》？请输入书名确认（不可恢复）：`, book.title);
    if (confirmName !== book.title) {
      setError("删除已取消：书名不匹配");
      return;
    }
    const data = await withBusy(() => adminDeleteBook(book.id));
    if (data) {
      if (activeBook === book.id) {
        setActiveBook(null);
        setActiveDetail(null);
      }
      refresh();
    }
  };

  const parseTags = (s) => {
    const tags = s.split(/[,，、\s]+/).map((t) => t.trim()).filter(Boolean);
    return [...new Set(tags)];
  };

  const [batchProgress, setBatchProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(BATCH_PROGRESS_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { total: 0, done: 0, success: 0, failed: 0, current: "" };
  });

  const saveBatchProgress = (p) => {
    setBatchProgress(p);
    try { localStorage.setItem(BATCH_PROGRESS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  };

  const importFiles = async (files, isRetry = false) => {
    if (!files.length) return;
    const total = isRetry ? files.length : batchProgress.total + files.length;
    const done = isRetry ? 0 : batchProgress.done;
    const success = isRetry ? 0 : batchProgress.success;
    const failed = isRetry ? 0 : batchProgress.failed;
    const newFailed = [];
    saveBatchProgress({ total, done: 0, success: 0, failed: 0, current: "" });
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = file.name.replace(/\.txt$/i, "").replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, "_");
      if (!id) continue;
      saveBatchProgress(p => ({ ...p, current: file.name, done: p.done + 1 }));
      if (!isRetry && books.some((b) => b.id === id)) continue;
      const text = await file.text();
      try {
        await adminCreateBook({ id, title: id, author: "佚名", description: "" });
        await adminImportText(id, text);
        saveBatchProgress(p => ({ ...p, success: p.success + 1 }));
      } catch (e) {
        newFailed.push(file);
        saveBatchProgress(p => ({ ...p, failed: p.failed + 1 }));
        console.error(`批量导入失败: ${file.name}`, e);
      }
    }
    setBatchFiles([]);
    setFailedFiles(newFailed);
    saveBatchProgress(p => ({ ...p, current: newFailed.length ? `完成，${newFailed.length} 项失败可重试` : "全部完成" }));
    refresh();
  };

  const handleBatchImport = async () => {
    if (!batchFiles.length) return;
    await importFiles(batchFiles);
  };

  const retryFailed = () => {
    if (!failedFiles.length) return;
    importFiles(failedFiles, true);
  };

  const handleImportFull = async () => {
    if (!activeBook) return;
    if (!importText.trim()) {
      setError("请粘贴或选择 txt 全文");
      return;
    }
    const data = await withBusy(() => adminImportText(activeBook, importText));
    if (data) {
      setActiveDetail(data);
      setImportText("");
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setImportText(text);
  };

  const handleUploadCover = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeBook) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("封面图片过大（已超 2MB），请压缩后再上传（建议使用 TinyPNG 等工具）");
      return;
    }
    const data = await withBusy(() => adminUploadCover(activeBook, file));
    if (data) {
      setActiveDetail((d) => (d ? { ...d, cover: data.cover } : d));
      refresh();
    }
  };

  const handleSaveTags = async () => {
    if (!activeBook) return;
    const tags = parseTags(tagInput);
    const data = await withBusy(() => adminSetTags(activeBook, tags));
    if (data) {
      setActiveDetail((d) => (d ? { ...d, tags: data.tags } : d));
      setTagInput("");
      refresh();
    }
  };

  const openChapters = async (book) => {
    if (activeBook === book.id) {
      setActiveBook(null);
      setActiveDetail(null);
      setEditChapter(null);
      return;
    }
    const data = await withBusy(() => fetchBookDetail(book.id));
    if (data) {
      setActiveBook(book.id);
      setActiveDetail(data);
      setEditChapter(null);
    }
  };

  const startNewChapter = () => {
    setEditChapter({ id: null, title: "", content: "" });
    setChapterTitle("");
    setChapterContent("");
    loadDraft(activeBook, null);
  };

  const startEditChapter = (chapter) => {
    setEditChapter(chapter);
    setChapterTitle(chapter.title);
    setChapterContent("");
    loadDraft(activeBook, chapter.id);
    withBusy(async () => {
      const c = await fetchChapter(activeBook, chapter.id);
      setChapterContent(c.paragraphs.join("\n\n"));
    });
  };

  const saveChapter = async () => {
    if (!activeBook) return;
    saveDraft(activeBook, editChapter?.id || null);
    if (editChapter.id) {
      const data = await withBusy(() =>
        adminUpdateChapter(activeBook, editChapter.id, { title: chapterTitle, content: chapterContent })
      );
      if (data) {
        setActiveDetail(data);
        setEditChapter(null);
        clearDraft(activeBook, editChapter?.id || null);
      }
    } else {
      const data = await withBusy(() =>
        adminCreateChapter(activeBook, { title: chapterTitle, content: chapterContent })
      );
      if (data) {
        setActiveDetail(data);
        setEditChapter(null);
        clearDraft(activeBook, editChapter?.id || null);
      }
    }
  };

  const deleteChapter = async (chapter) => {
    if (!confirm(`删除章节「${chapter.title}」？此操作不可恢复。`)) return;
    const data = await withBusy(() => adminDeleteChapter(activeBook, chapter.id));
    if (data) {
      setActiveDetail(data);
      setEditChapter(null);
      clearDraft(activeBook, chapter.id);
    }
  };

  const handleReorder = async (newChapters) => {
    setActiveDetail({ ...activeDetail, chapters: newChapters });
    const newOrder = newChapters.map((ch) => parseInt(ch.id.split("_")[0] || ch.id, 10));
    try {
      await adminReorderChapters(activeBook, newOrder);
      refresh();
    } catch (err) {
      setError("章节排序保存失败: " + err.message);
    }
  };

  return (
    <div className="admin page-enter">
      <AdminHeader
        adminKeyInput={adminKeyInput}
        onKeyInputChange={setAdminKeyInput}
        onSaveKey={saveAdminKey}
        onClearKey={clearAdminKey}
        onReindex={runReindex}
        keySavedHint={keySavedHint}
        reindexMsg={reindexMsg}
        health={health}
        busy={busy}
      />

      {error && <div className="hint error">{error}</div>}
      {busy && <div className="hint">处理中…</div>}

      <BookCreateForm
        newId={newId}
        newTitle={newTitle}
        newAuthor={newAuthor}
        newDesc={newDesc}
        newTags={newTags}
        onNewIdChange={setNewId}
        onNewTitleChange={setNewTitle}
        onNewAuthorChange={setNewAuthor}
        onNewDescChange={setNewDesc}
        onNewTagsChange={setNewTags}
        onCreate={handleCreate}
        batchFiles={batchFiles}
        onBatchFilesChange={setBatchFiles}
        onBatchImport={handleBatchImport}
        batchProgress={batchProgress}
        failedFiles={failedFiles}
        onRetryFailed={retryFailed}
        busy={busy}
      />

      <BookList
        books={books}
        activeBook={activeBook}
        editingBook={editingBook}
        busy={busy}
        onOpenChapters={openChapters}
        onStartEditInfo={startEditInfo}
        onEditingBookChange={setEditingBook}
        onSaveEditInfo={saveEditInfo}
        onCancelEditInfo={cancelEditInfo}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      {activeDetail && (
        <ChapterManager
          activeDetail={activeDetail}
          activeBook={activeBook}
          busy={busy}
          chapterTitle={chapterTitle}
          chapterContent={chapterContent}
          importText={importText}
          tagInput={tagInput}
          editChapter={editChapter}
          onStartNewChapter={startNewChapter}
          onStartEditChapter={startEditChapter}
          onSaveChapter={saveChapter}
          onDeleteChapter={deleteChapter}
          onChapterTitleChange={setChapterTitle}
          onChapterContentChange={setChapterContent}
          onCancelEdit={() => setEditChapter(null)}
          onImportTextChange={setImportText}
          onImportFileChange={handleImportFile}
          onImportFull={handleImportFull}
          onUploadCover={handleUploadCover}
          onTagInputChange={setTagInput}
          onSaveTags={handleSaveTags}
          onReorder={handleReorder}
          onError={setError}
        />
      )}
    </div>
  );
}
