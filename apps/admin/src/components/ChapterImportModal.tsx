/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Modal,
  Upload,
  Progress,
  Tag,
  Space,
  Alert,
  Typography,
  Checkbox,
  Drawer,
  Tooltip,
} from "antd";
import {
  InboxOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  DeleteOutlined,
  ClearOutlined,
  EyeOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { importChapters } from "@/api/chapter-api";
import "./ChapterImportModal.css";

const ACCEPT = ".txt,text/plain";
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 200;
const MAX_PREVIEW_BYTES = 100 * 1024;

type FileStatus = "pending" | "importing" | "success" | "error";

interface ImportFileItem {
  uid: string;
  name: string;
  size: number;
  status: FileStatus;
  error?: string;
  wordCount?: number;
  file: File;
  /** 前端预拦截项（超大/空文件/超限），不参与重试 */
  blocked?: boolean;
}

interface ChapterImportModalProps {
  open: boolean;
  novelId: string;
  onCancel: () => void;
  onDone: (importedCount: number) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function estimateWords(text: string): number {
  const t = text.replace(/\s+/g, "");
  return t.length;
}

interface SortableItemProps {
  item: ImportFileItem;
  importing: boolean;
  children: React.ReactNode;
}

function SortableItem({ item, importing, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.uid });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    cursor: isDragging ? "grabbing" : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ci-item ci-item-${item.status}${isDragging ? " ci-item-dragging" : ""}`}
      {...attributes}
      {...(importing ? {} : listeners)}
    >
      <span className="ci-item-drag-handle" {...(importing ? {} : listeners)}>
        <HolderOutlined style={{ fontSize: 14, color: "var(--color-text-tertiary)" }} />
      </span>
      {children}
    </div>
  );
}

export default function ChapterImportModal({
  open,
  novelId,
  onCancel,
  onDone,
}: ChapterImportModalProps) {
  const { t } = useTranslation();
  const [fileList, setFileList] = useState<ImportFileItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isVip, setIsVip] = useState(false);
  const [done, setDone] = useState(false);
  const [previewItem, setPreviewItem] = useState<ImportFileItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const dirInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleReorderEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (importing) return;
    setFileList((prev) => {
      const oldIndex = prev.findIndex((f) => f.uid === active.id);
      const newIndex = prev.findIndex((f) => f.uid === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const openPreview = async (item: ImportFileItem) => {
    setPreviewItem(item);
    setPreviewContent("");
    setPreviewLoading(true);
    try {
      const text = await item.file.slice(0, MAX_PREVIEW_BYTES).text();
      setPreviewContent(text);
    } catch {
      setPreviewContent(t("chapterImport:previewFailed"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const pendingCount = useMemo(
    () => fileList.filter((f) => f.status === "pending").length,
    [fileList],
  );
  const successCount = useMemo(
    () => fileList.filter((f) => f.status === "success").length,
    [fileList],
  );
  const errorCount = useMemo(
    () => fileList.filter((f) => f.status === "error").length,
    [fileList],
  );
  const totalWords = useMemo(
    () => fileList.reduce((acc, f) => acc + (f.wordCount ?? 0), 0),
    [fileList],
  );

  const reset = useCallback(() => {
    setFileList([]);
    setImporting(false);
    setProgress(0);
    setDone(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onCancel();
  }, [onCancel, reset]);

  const appendFiles = useCallback(
    (rawFiles: FileList | File[]) => {
      setDone(false);
      const accepted = Array.from(rawFiles)
        .filter((f) => f.name.toLowerCase().endsWith(".txt"))
        .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
      if (accepted.length > MAX_FILES) {
        setFileList((prev) => {
          const blocked: ImportFileItem = {
            uid: `limit-${Date.now()}`,
            name: t("chapterImport:tooManyFiles", { count: MAX_FILES }),
            size: 0,
            status: "error",
            error: t("chapterImport:tooManyFiles", { count: MAX_FILES }),
            wordCount: 0,
            blocked: true,
            file: new File([], "limit"),
          };
          return [...prev, blocked];
        });
      }
      const newItems: ImportFileItem[] = accepted
        .slice(0, MAX_FILES)
        .map((f) => {
          const oversized = f.size > MAX_SIZE;
          const empty = f.size === 0;
          const blocked = oversized || empty;
          return {
            uid: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
            name: f.name,
            size: f.size,
            file: f,
            status: blocked ? ("error" as FileStatus) : ("pending" as FileStatus),
            error: oversized
              ? t("chapterImport:fileTooLarge")
              : empty
                ? t("chapterImport:fileEmpty")
                : undefined,
            blocked: blocked || undefined,
            wordCount: 0,
          };
        });
      setFileList((prev) => {
        const existing = new Set(prev.map((p) => p.name));
        const combined = [...prev, ...newItems.filter((n) => !existing.has(n.name))];
        return combined;
      });
      accepted.forEach((f) => {
        f.slice(0, MAX_PREVIEW_BYTES)
          .text()
          .then((text) => {
            setFileList((prev) =>
              prev.map((p) =>
                p.name === f.name ? { ...p, wordCount: estimateWords(text) } : p,
              ),
            );
          })
          .catch(() => {
            // 忽略读取失败，保留 0 字数
          });
      });
    },
    [t],
  );

  const beforeUpload = (_file: File, fileListArg: File[]) => {
    // 阻止自动上传，仅收集到 fileList
    appendFiles(fileListArg);
    return Upload.LIST_IGNORE;
  };

  const handleSelectDirectory = () => {
    dirInputRef.current?.click();
  };

  const handleDirChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) appendFiles(files);
    e.target.value = "";
  };

  const handleRemove = (uid: string) => {
    if (importing) return;
    setFileList((prev) => prev.filter((f) => f.uid !== uid));
  };

  const handleClear = () => {
    if (importing) return;
    setFileList([]);
  };

  const handleRetryFailed = () => {
    if (importing) return;
    setDone(false);
    setFileList((prev) =>
      prev.map((p) =>
        p.status === "error" && !p.blocked
          ? { ...p, status: "pending", error: undefined }
          : p,
      ),
    );
  };

  const handleImport = async () => {
    const targets = fileList.filter((f) => f.status === "pending");
    if (targets.length === 0) return;
    setImporting(true);
    setProgress(0);
    setDone(false);
    setFileList((prev) =>
      prev.map((p) =>
        p.status === "pending" ? { ...p, status: "importing" } : p,
      ),
    );

    // 一次请求批量上传；请求期间进度条模拟爬升（真实上传进度无法从 fetch 感知）
    const timer = window.setInterval(() => {
      setProgress((p) => Math.min(85, p + 2));
    }, 400);

    let imported = 0;
    try {
      const res = await importChapters(
        novelId,
        targets.map((f) => f.file),
        isVip,
      );
      const successByFile = new Map(
        res.list.map((x) => [x.sourceFile, x] as const),
      );
      const errorByFile = new Map(res.errors.map((e) => [e.filename, e.reason] as const));
      imported = successByFile.size;
      setFileList((prev) =>
        prev.map((p) => {
          const ok = successByFile.get(p.name);
          if (ok) {
            return { ...p, status: "success", wordCount: ok.wordCount };
          }
          const reason = errorByFile.get(p.name);
          if (reason !== undefined) {
            return { ...p, status: "error", error: reason };
          }
          return p.status === "importing"
            ? { ...p, status: "error", error: t("chapterImport:importFailed") }
            : p;
        }),
      );
    } catch (err: any) {
      setFileList((prev) =>
        prev.map((p) =>
          p.status === "importing"
            ? { ...p, status: "error", error: err?.message ?? t("chapterImport:networkError") }
            : p,
        ),
      );
    } finally {
      window.clearInterval(timer);
    }
    setProgress(100);
    setImporting(false);
    setDone(true);
    if (imported > 0) onDone(imported);
  };

  const statusTag = (f: ImportFileItem) => {
    switch (f.status) {
      case "pending":
        return <Tag>{t("chapterImport:statusPending")}</Tag>;
      case "importing":
        return (
          <Tag icon={<LoadingOutlined spin />} color="processing">
            {t("chapterImport:statusImporting")}
          </Tag>
        );
      case "success":
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            {t("chapterImport:statusSuccess")}
          </Tag>
        );
      case "error":
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            {t("chapterImport:statusError")}
          </Tag>
        );
    }
  };

  const canImport = pendingCount > 0 && !importing;

  return (
    <Modal
      title={
        <div className="ci-modal-title">
          <span className="ci-modal-title-icon">
            <FileTextOutlined />
          </span>
          <span>{t("chapterImport:title")}</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      closable={!importing}
      maskClosable={!importing}
      keyboard={!importing}
      width={720}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={importing}>
          {t("chapterImport:cancel")}
        </Button>,
        <Button
          key="import"
          type="primary"
          icon={importing ? <LoadingOutlined /> : <InboxOutlined />}
          disabled={!canImport}
          loading={importing}
          onClick={handleImport}
        >
          {importing
            ? t("chapterImport:importing")
            : done && pendingCount > 0
              ? t("chapterImport:continueImport", { count: pendingCount })
              : t("chapterImport:startImport", { count: pendingCount })}
        </Button>,
      ]}
      destroyOnClose={false}
    >
      <input
        ref={dirInputRef}
        type="file"
        multiple
        accept={ACCEPT}
        style={{ display: "none" }}
        onChange={handleDirChange}
        {...({ webkitdirectory: "" } as any)}
      />

      <Alert
        className="ci-tip"
        type="info"
        showIcon
        message={t("chapterImport:tip")}
      />

      <Upload.Dragger
        multiple
        accept={ACCEPT}
        beforeUpload={beforeUpload}
        showUploadList={false}
        disabled={importing}
        className="ci-dragger"
      >
        <p className="ci-dragger-icon">
          <InboxOutlined />
        </p>
        <p className="ci-dragger-title">{t("chapterImport:dragTitle")}</p>
        <p className="ci-dragger-desc">{t("chapterImport:dragDesc")}</p>
        <Button
          className="ci-dir-btn"
          icon={<FolderOpenOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectDirectory();
          }}
        >
          {t("chapterImport:selectDirectory")}
        </Button>
      </Upload.Dragger>

      <div className="ci-toolbar">
        <Typography.Text type="secondary">
          {t("chapterImport:fileCount", {
            total: fileList.length,
            pending: pendingCount,
          })}
        </Typography.Text>
        <Space>
          <Checkbox
            checked={isVip}
            onChange={(e) => setIsVip(e.target.checked)}
            disabled={importing}
          >
            {t("chapterImport:vipChapter")}
          </Checkbox>
          {errorCount > 0 && !importing && (
            <Button
              type="text"
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={handleRetryFailed}
            >
              {t("chapterImport:retryFailed", { count: errorCount })}
            </Button>
          )}
          {fileList.length > 0 && (
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={importing}
            >
              {t("chapterImport:clearAll")}
            </Button>
          )}
        </Space>
      </div>

      {fileList.length > 0 && (
        <div className="ci-stats">
          <div className="ci-stat">
            <span className="ci-stat-value ci-stat-success">{successCount}</span>
            <span className="ci-stat-label">{t("chapterImport:statusSuccess")}</span>
          </div>
          <div className="ci-stat">
            <span className="ci-stat-value ci-stat-error">{errorCount}</span>
            <span className="ci-stat-label">{t("chapterImport:statusError")}</span>
          </div>
          <div className="ci-stat">
            <span className="ci-stat-value ci-stat-pending">{pendingCount}</span>
            <span className="ci-stat-label">{t("chapterImport:statusPending")}</span>
          </div>
          <div className="ci-stat">
            <span className="ci-stat-value ci-stat-words">
              {totalWords.toLocaleString()}
            </span>
            <span className="ci-stat-label">{t("chapterImport:totalWords")}</span>
          </div>
        </div>
      )}

      {fileList.length > 0 && (
        <div className="ci-list">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleReorderEnd}
          >
            <SortableContext
              items={fileList.map((f) => f.uid)}
              strategy={verticalListSortingStrategy}
            >
              {fileList.map((f) => (
                <SortableItem key={f.uid} item={f} importing={importing}>
                  <span className="ci-item-icon">
                    <FileTextOutlined />
                  </span>
                  <div className="ci-item-main">
                    <div className="ci-item-name" title={f.name}>
                      <Tooltip title={t("chapterImport:previewTooltip")}>
                        <span
                          className="ci-item-name-link"
                          onClick={() => !importing && openPreview(f)}
                        >
                          {f.name}
                        </span>
                      </Tooltip>
                    </div>
                    <div className="ci-item-meta">
                      <span>{(f.wordCount ?? 0).toLocaleString()} {t("chapterImport:words")}</span>
                      <span className="ci-item-dot">·</span>
                      <span>{formatSize(f.size ?? 0)}</span>
                    </div>
                  </div>
                  <div className="ci-item-status">{statusTag(f)}</div>
                  <Button
                    className="ci-item-preview"
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => openPreview(f)}
                    disabled={importing}
                    aria-label={t("chapterImport:preview")}
                  />
                  <Button
                    className="ci-item-remove"
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemove(f.uid)}
                    disabled={importing}
                    aria-label={t("chapterImport:remove")}
                  />
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {errorCount > 0 && (
        <Alert
          className="ci-result-alert"
          type="warning"
          showIcon
          message={t("chapterImport:errorSummary", { count: errorCount })}
          description={
            <ul className="ci-error-list">
              {fileList
                .filter((f) => f.status === "error")
                .map((f) => (
                  <li key={f.uid}>
                    <strong>{f.name}</strong>: {f.error}
                  </li>
                ))}
            </ul>
          }
        />
      )}

      {importing && (
        <div className="ci-progress">
          <div className="ci-progress-label">
            {t("chapterImport:uploading", { count: fileList.length })} ({progress}%)
          </div>
          <Progress percent={progress} status={progress >= 100 ? "success" : "active"} />
        </div>
      )}

      {done && successCount > 0 && (
        <Alert
          className="ci-result-alert"
          type="success"
          showIcon
          message={t("chapterImport:doneMessage", { count: successCount })}
        />
      )}

      <Drawer
        title={previewItem?.name}
        open={!!previewItem}
        onClose={() => setPreviewItem(null)}
        width={480}
        extra={
          <Button size="small" onClick={() => setPreviewItem(null)}>
            {t("chapterImport:cancel")}
          </Button>
        }
      >
        {previewLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <LoadingOutlined spin style={{ fontSize: 24 }} />
          </div>
        ) : (
          <div className="ci-preview-content">
            <div className="ci-preview-meta">
              <span>{(previewItem?.wordCount ?? 0).toLocaleString()} {t("chapterImport:words")}</span>
              <span className="ci-item-dot">·</span>
              <span>{previewItem ? formatSize(previewItem.size) : ""}</span>
            </div>
            <div className="ci-preview-body">
              {previewContent
                ? previewContent
                : t("chapterImport:previewFailed")}
            </div>
          </div>
        )}
      </Drawer>
    </Modal>
  );
}