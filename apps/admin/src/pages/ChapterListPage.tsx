/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Space,
  Tag,
  Dropdown,
  Drawer,
  Input,
  App,
  Modal,
  Form,
  Switch,
  Result,
  Skeleton,
  Segmented,
  Tooltip,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  HolderOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  MoreOutlined,
  SaveOutlined,
  CloseOutlined,
  FormOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
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
import type { BChapterDetail, BChapterStatus } from "@novel/types";
import { BPageHeader } from "@novel/b-end";
import type { BPageHeaderProps } from "@novel/b-end";
import { BFilterBar } from "@novel/b-end";
import type { FilterField } from "@novel/b-end";
import { BTable } from "@novel/b-end";
import { BBatchActionBar } from "@novel/b-end";
import type { BatchAction } from "@novel/b-end";
import { useAuthStore } from "@/stores/authStore";
import { fetchNovelDetail } from "@/api/novel-api";
import {
  fetchChapterList,
  reorderChapters,
  transitionChapterStatus,
  batchOperateChapters,
  deleteChapter,
  createChapter,
  updateChapter,
  CHAPTER_STATUS_OPTIONS,
  CHAPTER_STATUS_TAG,
} from "@/api/chapter-api";
import ChapterImportModal from "@/components/ChapterImportModal";
import "./ChapterListPage.css";

interface RowContextValue {
  listeners?: ReturnType<typeof useSortable>["listeners"];
  isDragging?: boolean;
}
const RowContext = createContext<RowContextValue>({});

function DragHandle({ enabled }: { enabled: boolean }) {
  const { listeners } = useContext(RowContext);
  return (
    <HolderOutlined
      {...(enabled ? listeners : {})}
      style={{
        cursor: enabled ? "grab" : "not-allowed",
        color: enabled
          ? "var(--color-text-tertiary)"
          : "var(--color-text-disabled)",
      }}
    />
  );
}

function DraggableRow({
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { "data-row-key"?: string }) {
  const id = props["data-row-key"] as string;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    background: isDragging ? "var(--color-bg-elevated)" : undefined,
  };
  return (
    <RowContext.Provider value={{ listeners, isDragging }}>
      <tr ref={setNodeRef} style={style} {...attributes} {...props}>
        {children}
      </tr>
    </RowContext.Provider>
  );
}

function InlineEditableTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<{ focus: () => void } | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(value);
      setEditing(false);
      return;
    }
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <Space>
        <Input
          ref={inputRef as any}
          size="small"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          maxLength={50}
          style={{ width: 280 }}
          disabled={saving}
        />
        <Button
          type="link"
          size="small"
          icon={<SaveOutlined />}
          onClick={commit}
          disabled={saving}
          aria-label={t("common:save")}
        />
        <Button
          type="link"
          size="small"
          icon={<CloseOutlined />}
          onClick={cancel}
          disabled={saving}
          aria-label={t("common:cancel")}
        />
      </Space>
    );
  }

  return (
    <Tooltip title={t("chapter:editTitleTooltip")}>
      <span
        onDoubleClick={() => setEditing(true)}
        style={{
          cursor: "pointer",
          color: "var(--color-text-primary)",
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
        }}
      >
        {value}
        <FormOutlined
          style={{
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            opacity: 0,
            transition: "opacity 0.2s",
          }}
          className="b-chapter-edit-icon"
        />
      </span>
    </Tooltip>
  );
}

type PageStatus =
  | "loading"
  | "ready"
  | "empty"
  | "no-search-result"
  | "error"
  | "no-permission"
  | "not-found";

export default function ChapterListPage() {
  const { t } = useTranslation();
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [novelTitle, setNovelTitle] = useState<string>("");
  const [novelCompleted, setNovelCompleted] = useState<boolean | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [searchKey, setSearchKey] = useState("");
  const [filterStatus, setFilterStatus] = useState<BChapterStatus | "all">(
    "all",
  );
  const [sortBy, setSortBy] = useState<"index" | "updatedAt">("index");
  const [dataSource, setDataSource] = useState<BChapterDetail[]>([]);
  const highlightRef = useRef<Set<string>>(new Set());
  const [totalWords, setTotalWords] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [previewChapter, setPreviewChapter] = useState<BChapterDetail | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [contentSaving, setContentSaving] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [contentValue, setContentValue] = useState("");
  const [createForm] = Form.useForm<{
    title: string;
    content: string;
    isVip: boolean;
  }>();

  const canEdit = hasPermission("chapter.edit");
  const canCreate = hasPermission("chapter.create");
  const canDelete = hasPermission("chapter.delete");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const loadData = useCallback(async () => {
    if (!novelId) {
      setStatus("not-found");
      return;
    }
    setStatus("loading");
    try {
      const [novel, res] = await Promise.all([
        fetchNovelDetail(novelId),
        fetchChapterList({
          novelId,
          page,
          pageSize,
          searchKey,
          status: filterStatus,
          sortBy,
        }),
      ]);
      if (novel) {
        setNovelTitle(novel.title);
        setNovelCompleted(novel.isCompleted);
      }
      setDataSource(res.list);
      setTotal(res.total);
      setTotalWords(res.totalWords);
      const filtered = searchKey || filterStatus !== "all";
      setStatus(
        res.list.length === 0
          ? filtered
            ? "no-search-result"
            : "empty"
          : "ready",
      );
    } catch {
      setStatus("error");
    }
  }, [novelId, page, pageSize, searchKey, filterStatus, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (sortBy !== "index") {
      message.warning(t("chapter:message.sortWarning"));
      return;
    }
    // 分页下仅当当前页包含全部章节时才允许拖拽排序，否则提交部分列表会覆盖其他章节序号
    if (total > pageSize) {
      message.warning(t("chapter:message.sortPaginatedWarning"));
      return;
    }
    const oldIndex = dataSource.findIndex((c) => c.id === active.id);
    const newIndex = dataSource.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(dataSource, oldIndex, newIndex);
    const original = [...dataSource];
    setDataSource(next);
    try {
      await reorderChapters(
        novelId!,
        next.map((c) => c.id),
      );
      message.success(t("chapter:message.sortUpdated"));
    } catch {
      setDataSource(original);
      message.error(t("chapter:message.sortFailed"));
    }
  };

  const handleInlineSave = async (
    chapter: BChapterDetail,
    newTitle: string,
  ) => {
    await updateChapter(chapter.id, { title: newTitle });
    setDataSource((ds) =>
      ds.map((c) =>
        c.id === chapter.id
          ? { ...c, title: newTitle, updatedAt: Date.now() }
          : c,
      ),
    );
    message.success(t("chapter:message.titleUpdated"));
  };

  const handleTransition = (chapter: BChapterDetail, to: BChapterStatus) => {
    modal.confirm({
      title: t("chapter:confirmStatusChange", {
        title: chapter.title,
        status: CHAPTER_STATUS_TAG[to].text,
      }),
      content: t("chapter:confirmStatusDesc"),
      onOk: async () => {
        const res = await transitionChapterStatus(chapter.id, to);
        if (res.success) {
          message.success(t("chapter:message.statusUpdated"));
          loadData();
        } else {
          message.error(res.reason ?? t("chapter:message.statusUpdateFailed"));
        }
      },
    });
  };

  const handleDelete = (chapter: BChapterDetail) => {
    if (chapter.status === "published") {
      let inputTitle = "";
      modal.confirm({
        title: t("chapter:confirmDeletePublished", { title: chapter.title }),
        content: (
          <div>
            <p style={{ color: "var(--color-feedback-error)" }}>
              {t("chapter:confirmDeletePublishedDesc")}
            </p>
            <Input
              placeholder={chapter.title}
              onChange={(e) => {
                inputTitle = e.target.value;
              }}
            />
          </div>
        ),
        okText: t("chapter:confirmDelete"),
        okType: "danger",
        onOk: async () => {
          if (inputTitle !== chapter.title) {
            message.error(t("chapter:message.titleMismatch"));
            return Promise.reject();
          }
          const res = await deleteChapter(chapter.id, inputTitle);
          if (res.success) {
            message.success(t("chapter:message.deleted"));
            loadData();
          } else {
            message.error(res.reason ?? t("chapter:message.deleteFailed"));
          }
        },
      });
    } else {
      modal.confirm({
        title: t("chapter:confirmDeleteDraft", { title: chapter.title }),
        content: t("chapter:confirmDeleteDraftDesc"),
        okText: t("chapter:confirmDelete"),
        okType: "danger",
        onOk: async () => {
          const res = await deleteChapter(chapter.id);
          if (res.success) {
            message.success(t("chapter:message.deleted"));
            loadData();
          } else {
            message.error(res.reason ?? t("chapter:message.deleteFailed"));
          }
        },
      });
    }
  };

  const handleBatch = async (
    action: "publish" | "offline" | "delete" | "submit-audit",
  ) => {
    const ids = selectedRowKeys.map(String);
    const res = await batchOperateChapters(ids, action);
    if (res.success) {
      message.success(t("chapter:message.batchComplete"));
    } else if (res.failed && res.failed.length > 0) {
      message.warning(
        t("chapter:message.batchPartial", { count: res.failed.length }),
      );
    }
    setSelectedRowKeys([]);
    loadData();
  };

  const batchActions: BatchAction[] = [
    {
      key: "submit-audit",
      label: t("chapter:action.batchSubmit"),
      onClick: () => handleBatch("submit-audit"),
    },
    {
      key: "publish",
      label: t("chapter:action.batchPublish"),
      onClick: () => handleBatch("publish"),
    },
    {
      key: "offline",
      label: t("chapter:action.batchOffline"),
      onClick: () => handleBatch("offline"),
    },
    {
      key: "delete",
      label: t("chapter:action.batchDelete"),
      danger: true,
      confirmTitle: t("chapter:confirmBatchDelete"),
      confirmContent: t("chapter:confirmBatchDeleteDesc"),
      onClick: () => handleBatch("delete"),
    },
  ];

  const handleCreateSubmit = async () => {
    const values = await createForm.validateFields();
    const res = await createChapter({
      bookId: novelId!,
      title: values.title,
      content: values.content,
      isVip: values.isVip,
    });
    if (res.success) {
      message.success(t("chapter:message.chapterCreated"));
      setCreateModalOpen(false);
      createForm.resetFields();
      loadData();
    }
  };

  const handleImportDone = (
    importedCount: number,
    newIds: string[] = [],
  ) => {
    message.success(t("chapter:message.importComplete", { count: importedCount }));
    if (newIds.length > 0) {
      highlightRef.current = new Set(newIds);
      window.setTimeout(() => { highlightRef.current = new Set(); }, 6000);
    }
    loadData();
  };

  const columns: TableColumnsType<BChapterDetail> = [
    {
      key: "drag",
      title: "",
      dataIndex: "id",
      width: 40,
      fixed: "left",
      render: () => <DragHandle enabled={sortBy === "index"} />,
    },
    {
      title: t("chapter:table.index"),
      dataIndex: "index",
      key: "index",
      width: 64,
      align: "right",
      render: (v: number) => (
        <span style={{ fontFamily: "var(--font-mono)" }}>{v}</span>
      ),
    },
    {
      title: t("chapter:table.title"),
      dataIndex: "title",
      key: "title",
      render: (title: string, record) =>
        canEdit ? (
          <InlineEditableTitle
            value={title}
            onSave={(v) => handleInlineSave(record, v)}
          />
        ) : (
          <a
            onClick={() => openPreview(record)}
            style={{ color: "var(--color-brand)" }}
          >
            {title}
          </a>
        ),
    },
    {
      title: t("chapter:table.wordCount"),
      dataIndex: "wordCount",
      key: "wordCount",
      width: 96,
      align: "right",
      render: (v: number) => (
        <span style={{ fontFamily: "var(--font-mono)" }}>
          {v.toLocaleString()}
        </span>
      ),
    },
    {
      title: t("chapter:table.status"),
      dataIndex: "status",
      key: "status",
      width: 96,
      render: (s: BChapterStatus) => {
        const cfg = CHAPTER_STATUS_TAG[s];
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: t("chapter:table.vip"),
      dataIndex: "isVip",
      key: "isVip",
      width: 72,
      render: (v: boolean) =>
        v ? (
          <Tag color="gold" style={{ color: "var(--color-feedback-warning)" }}>
            VIP
          </Tag>
        ) : null,
    },
    {
      title: t("chapter:table.updatedAt"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 144,
      render: (v: number) => new Date(v).toLocaleString("zh-CN"),
    },
    {
      title: t("chapter:table.operation"),
      key: "action",
      fixed: "right",
      width: 160,
      render: (_, record) => {
        const menuItems: {
          key: string;
          label: string;
          icon: React.ReactNode;
          danger?: boolean;
        }[] = [
          {
            key: "view",
            label: t("chapter:action.preview"),
            icon: <EyeOutlined />,
          },
        ];
        if (canEdit) {
          menuItems.push({
            key: "edit",
            label: t("chapter:action.editTitle"),
            icon: <EditOutlined />,
          });
          if (record.status === "draft") {
            menuItems.push({
              key: "submit",
              label: t("chapter:action.submitAudit"),
              icon: <ArrowUpOutlined />,
            });
          } else if (record.status === "pending") {
            menuItems.push({
              key: "publish",
              label: t("chapter:action.publish"),
              icon: <ArrowUpOutlined />,
            });
          } else if (record.status === "published") {
            menuItems.push({
              key: "offline",
              label: t("chapter:action.offline"),
              icon: <ArrowDownOutlined />,
              danger: true,
            });
          } else if (record.status === "offline") {
            menuItems.push({
              key: "republish",
              label: t("chapter:action.reshelve"),
              icon: <ArrowUpOutlined />,
            });
          }
        }
        if (canDelete) {
          menuItems.push({
            key: "delete",
            label: t("chapter:action.delete"),
            icon: <DeleteOutlined />,
            danger: true,
          });
        }
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openPreview(record)}
            >
              {t("chapter:action.preview")}
            </Button>
            <Dropdown
              menu={{
                items: menuItems,
                onClick: ({ key }) => {
                  if (key === "view" || key === "edit") openPreview(record);
                  else if (key === "submit")
                    handleTransition(record, "pending");
                  else if (key === "publish" || key === "republish")
                    handleTransition(record, "published");
                  else if (key === "offline")
                    handleTransition(record, "offline");
                  else if (key === "delete") handleDelete(record);
                },
              }}
            >
              <Button type="link" size="small" icon={<MoreOutlined />}>
                {t("chapter:action.more")}
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const openPreview = (chapter: BChapterDetail) => {
    setPreviewChapter(chapter);
    setEditMode(false);
    setDraftContent(chapter.content ?? "");
    setDrawerOpen(true);
  };

  const handleSaveContent = async () => {
    if (!previewChapter || contentSaving) return;
    setContentSaving(true);
    try {
      await updateChapter(previewChapter.id, { content: draftContent });
      message.success(t("chapter:message.contentUpdated"));
      setEditMode(false);
      setPreviewChapter((prev) =>
        prev ? { ...prev, content: draftContent, updatedAt: Date.now() } : prev,
      );
      loadData();
    } catch {
      message.error(t("chapter:message.contentUpdateFailed"));
    } finally {
      setContentSaving(false);
    }
  };

  const breadcrumb: BPageHeaderProps["breadcrumb"] = useMemo(
    () => [
      { title: t("novel:breadcrumb.content") },
      { title: t("novel:breadcrumb.novel"), onClick: () => navigate("/novel") },
      {
        title: novelTitle || novelId || "作品",
        onClick: () => navigate(`/novel/${novelId}`),
      },
      { title: t("chapter:title") },
    ],
    [navigate, novelId, novelTitle, t],
  );

  if (status === "not-found") {
    return (
      <Result
        status="404"
        title={t("chapter:notFound")}
        subTitle={t("chapter:notFoundDesc")}
        extra={
          <Button onClick={() => navigate("/novel")}>
            {t("chapter:notFoundAction")}
          </Button>
        }
      />
    );
  }

  const stats = (
    <Space
      size="large"
      style={{
        color: "var(--color-text-secondary)",
        fontSize: "var(--font-size-body, 14px)",
      }}
    >
      <span>
        {t("chapter:stats.totalWords")}
        <strong style={{ fontFamily: "var(--font-mono)" }}>
          {totalWords.toLocaleString()}
        </strong>
      </span>
      <span>
        {t("chapter:stats.chapterCount")}
        <strong style={{ fontFamily: "var(--font-mono)" }}>{total}</strong>
      </span>
      <span>
        {t("chapter:stats.serialStatus")}
        {novelCompleted == null ? (
          <Tag>{t("common:loading")}</Tag>
        ) : novelCompleted ? (
          <Tag color="default">{t("chapter:stats.completed")}</Tag>
        ) : (
          <Tag color="success">{t("chapter:stats.ongoing")}</Tag>
        )}
      </span>
    </Space>
  );

  return (
    <div className="b-chapter-list-page">
      <BPageHeader
        title={t("chapter:pageTitle", {
          title: novelTitle || t("common:loading"),
        })}
        breadcrumb={breadcrumb}
        onBack={() => navigate(`/novel/${novelId}`)}
        extra={
          <Space>
            {canCreate && (
              <Button
                icon={<UploadOutlined />}
                onClick={() => setImportModalOpen(true)}
              >
                {t("chapter:action.import")}
              </Button>
            )}
            {canCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                {t("chapter:action.newChapter")}
              </Button>
            )}
          </Space>
        }
      />

      <div style={{ marginBottom: "var(--space-3)" }}>{stats}</div>

      <BFilterBar
        searchKey={searchKey}
        onSearch={(v) => {
          setSearchKey(v);
          setPage(1);
        }}
        searchPlaceholder={t("chapter:searchPlaceholder")}
        filters={
          [
            {
              name: "status",
              label: t("chapter:filter.status"),
              control: (
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as BChapterStatus | "all");
                    setPage(1);
                  }}
                  style={{
                    height: 32,
                    borderRadius: "var(--radius-md, 8px)",
                    border: "1px solid var(--color-border)",
                    padding: "0 var(--space-2)",
                    background: "var(--color-bg-surface)",
                  }}
                >
                  {CHAPTER_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ),
            },
          ] satisfies FilterField[]
        }
        extra={
          <Segmented
            value={sortBy}
            onChange={(v) => setSortBy(v as "index" | "updatedAt")}
            options={[
              { label: t("chapter:sort.byIndex"), value: "index" },
              { label: t("chapter:sort.byUpdatedAt"), value: "updatedAt" },
            ]}
          />
        }
      />

      {status === "loading" ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : status === "error" ? (
        <Result
          status="error"
          title={t("chapter:loadError")}
          subTitle={t("chapter:loadErrorDesc")}
          extra={
            <Button type="primary" onClick={loadData}>
              {t("common:retry")}
            </Button>
          }
        />
      ) : status === "empty" || status === "no-search-result" ? (
        <Result
          status="info"
          title={
            status === "no-search-result"
              ? t("chapter:emptySearchTitle")
              : t("chapter:emptyTitle")
          }
          subTitle={
            status === "no-search-result"
              ? t("chapter:emptySearchDesc")
              : t("chapter:emptyDesc")
          }
          extra={
            status === "empty" && canCreate ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                {t("chapter:emptyAction")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={dataSource.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <BTable
              columns={columns as any}
              dataSource={dataSource as any}
              rowKey="id"
              size="small"
              scroll={{ x: 1200, y: 600 }}
              components={{ body: { row: DraggableRow } } as any}
              rowClassName={(record) => {
                const rid = String(record.id ?? "");
                return highlightRef.current.has(rid) ? "b-chapter-row-highlight" : "";
              }}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                pageSizeOptions: [20, 50, 100],
                showTotal: (totalCount) =>
                  t("chapter:pagination", { count: totalCount }),
                onChange: (p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                },
              }}
              rowSelection={
                {
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                  columnWidth: 40,
                } as any
              }
              locale={{
                emptyText: t("chapter:emptyTable"),
              }}
            />
          </SortableContext>
        </DndContext>
      )}

      {batchActions.length > 0 && (
        <BBatchActionBar
          selectedCount={selectedRowKeys.length}
          actions={batchActions}
          visible={selectedRowKeys.length > 0}
          onClear={() => setSelectedRowKeys([])}
        />
      )}

      <Drawer
        title={previewChapter?.title}
        open={drawerOpen}
        onClose={() => {
          if (editMode) {
            setEditMode(false);
            setDraftContent(previewChapter?.content ?? "");
            return;
          }
          setDrawerOpen(false);
        }}
        width={520}
        extra={
          <Space>
            {canEdit && !editMode && previewChapter && (
              <Button
                icon={<FormOutlined />}
                onClick={() => {
                  setDraftContent(previewChapter?.content ?? "");
                  setEditMode(true);
                }}
              >
                {t("chapter:action.editContent")}
              </Button>
            )}
            <Button
              onClick={() => {
                if (editMode) {
                  setEditMode(false);
                  setDraftContent(previewChapter?.content ?? "");
                } else {
                  setDrawerOpen(false);
                }
              }}
            >
              {t("common:close")}
            </Button>
          </Space>
        }
      >
        {previewChapter ? (
          <div>
            <div className="b-preview-meta">
              <span className="b-preview-meta-item">
                {t("chapter:preview.wordCount")}
                <strong>{previewChapter.wordCount.toLocaleString()}</strong>
              </span>
              <span className="b-preview-meta-item">
                <Tag color={CHAPTER_STATUS_TAG[previewChapter.status].color}>
                  {CHAPTER_STATUS_TAG[previewChapter.status].text}
                </Tag>
              </span>
              {previewChapter.isVip && (
                <span className="b-preview-meta-item">
                  <Tag color="gold" style={{ margin: 0 }}>VIP</Tag>
                </span>
              )}
              <span className="b-preview-meta-item">
                {t("chapter:preview.saved")}
                {new Date(previewChapter.updatedAt).toLocaleString("zh-CN")}
              </span>
            </div>

            {editMode ? (
              <div className="b-preview-edit">
                <Input.TextArea
                  className="b-preview-editor"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={18}
                  maxLength={10000}
                  placeholder={t("chapter:newChapter.contentPlaceholder")}
                />
                <div className="b-preview-edit-actions">
                  <span className="b-preview-edit-count">
                    {t("chapter:newChapter.contentWords")}:{" "}
                    <strong>{draftContent.replace(/\s+/g, "").length}</strong>
                  </span>
                  <Space>
                    <Button
                      onClick={() => {
                        setEditMode(false);
                        setDraftContent(previewChapter?.content ?? "");
                      }}
                      disabled={contentSaving}
                    >
                      {t("common:cancel")}
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={contentSaving}
                      onClick={handleSaveContent}
                    >
                      {t("common:save")}
                    </Button>
                  </Space>
                </div>
              </div>
            ) : previewChapter.content ? (
              <div className="b-preview-body">
                {previewChapter.content}
              </div>
            ) : (
              <div className="b-preview-empty">
                {t("chapter:preview.empty")}
              </div>
            )}
          </div>
        ) : (
          <div className="b-preview-empty">{t("common:loading")}</div>
        )}
      </Drawer>

      <ChapterImportModal
        open={importModalOpen}
        novelId={novelId!}
        onCancel={() => setImportModalOpen(false)}
        onDone={handleImportDone}
      />

      <Modal
        title={t("chapter:newChapter.title")}
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          setContentValue("");
        }}
        onOk={handleCreateSubmit}
        okText={t("chapter:newChapter.create")}
        cancelText={t("chapter:newChapter.cancel")}
        width={680}
        destroyOnClose
        className="b-create-modal"
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ isVip: false }}
          onValuesChange={(changed) => {
            if ("content" in changed) setContentValue(changed.content);
          }}
          className="b-create-form"
        >
          <Form.Item
            name="title"
            label={t("chapter:newChapter.fieldTitle")}
            rules={[
              {
                required: true,
                message: t("chapter:newChapter.titleRequired"),
              },
              { min: 1, max: 50, message: t("chapter:newChapter.titleLength") },
            ]}
          >
            <Input
              placeholder={t("chapter:newChapter.titlePlaceholder")}
              maxLength={50}
              showCount
            />
          </Form.Item>
          <Form.Item
            name="content"
            label={t("chapter:newChapter.fieldContent")}
            rules={[
              {
                required: true,
                message: t("chapter:newChapter.contentRequired"),
              },
              { min: 100, message: t("chapter:newChapter.contentMin") },
            ]}
          >
            <Input.TextArea
              className="b-create-editor"
              rows={14}
              placeholder={t("chapter:newChapter.contentPlaceholder")}
              maxLength={10000}
            />
          </Form.Item>
          <div className="b-create-count">
            <span>
              {t("chapter:newChapter.contentChars")}
              <strong>{(contentValue ?? "").length}</strong>
            </span>
            <span>
              {t("chapter:newChapter.contentWords")}
              <strong>{(contentValue ?? "").replace(/\s+/g, "").length}</strong>
            </span>
            <span className="b-create-count-req">
              {(contentValue ?? "").replace(/\s+/g, "").length < 100 && (
                <span style={{ color: "var(--color-feedback-error, #ff4d4f)" }}>
                  {t("chapter:newChapter.contentMin")}
                </span>
              )}
            </span>
          </div>
          <Form.Item
            name="isVip"
            label={t("chapter:newChapter.vipChapter")}
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
