/* ============================================================
 * P5-1 · 章节管理页
 * 拖拽排序（dnd-kit）+ 行内标题编辑 + 状态 Tag + VIP 标记 + Drawer 预览
 * 紧凑行高 40px（small size），默认每页 50 条
 * 状态流转：draft → pending → published → offline → published
 * Source: 04 §5.5 / P5-1
 * ============================================================ */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
} from 'antd';
import type { TableColumnsType } from 'antd';
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
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import type { BChapterDetail, BChapterStatus } from '@novel/types';
import { BPageHeader } from '@novel/b-end';
import type { BPageHeaderProps } from '@novel/b-end';
import { BTable } from '@novel/b-end';
import { BBatchActionBar } from '@novel/b-end';
import type { BatchAction } from '@novel/b-end';
import { useAuthStore } from '@/stores/authStore';
import { fetchNovelDetail } from '@/api/novel-api';
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
} from '@/api/chapter-api';

/** 紧凑行高（P5-1-9，40px，由 size='small' 实现） */

/** Row Context：将 dnd-kit listeners 从 DraggableRow 传递到 holder 单元格 */
interface RowContextValue {
  listeners?: ReturnType<typeof useSortable>['listeners'];
  isDragging?: boolean;
}
const RowContext = createContext<RowContextValue>({});

/** 拖拽手柄：在 holder 列单元格内消费 listeners */
function DragHandle({ enabled }: { enabled: boolean }) {
  const { listeners } = useContext(RowContext);
  return (
    <HolderOutlined
      {...(enabled ? listeners : {})}
      style={{
        cursor: enabled ? 'grab' : 'not-allowed',
        color: enabled ? 'var(--color-text-tertiary)' : 'var(--color-text-disabled)',
      }}
    />
  );
}

/** 拖拽行：注入到 Table components.body.row，通过 Context 暴露 listeners */
function DraggableRow({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { 'data-row-key'?: string }) {
  const id = props['data-row-key'] as string;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    background: isDragging ? 'var(--color-bg-elevated)' : undefined,
  };
  return (
    <RowContext.Provider value={{ listeners, isDragging }}>
      <tr ref={setNodeRef} style={style} {...attributes} {...props}>
        {children}
      </tr>
    </RowContext.Provider>
  );
}

/** 行内标题编辑单元 */
function InlineEditableTitle({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
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
          ref={inputRef as never}
          size="small"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          maxLength={50}
          style={{ width: 280 }}
          disabled={saving}
        />
        <Button type="link" size="small" icon={<SaveOutlined />} onClick={commit} disabled={saving} />
        <Button type="link" size="small" icon={<CloseOutlined />} onClick={cancel} disabled={saving} />
      </Space>
    );
  }

  return (
    <Tooltip title="双击编辑标题">
      <span
        onDoubleClick={() => setEditing(true)}
        style={{ cursor: 'pointer', color: 'var(--color-text-primary)' }}
      >
        {value}
      </span>
    </Tooltip>
  );
}

type PageStatus = 'loading' | 'ready' | 'empty' | 'no-search-result' | 'error' | 'no-permission' | 'not-found';

export default function ChapterListPage() {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [novelTitle, setNovelTitle] = useState<string>('');
  const [status, setStatus] = useState<PageStatus>('loading');
  const [searchKey, setSearchKey] = useState('');
  const [filterStatus, setFilterStatus] = useState<BChapterStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'index' | 'updatedAt'>('index');
  const [dataSource, setDataSource] = useState<BChapterDetail[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [previewChapter, setPreviewChapter] = useState<BChapterDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm<{ title: string; content: string; isVip: boolean }>();

  const canEdit = hasPermission('chapter.edit' as never);
  const canCreate = hasPermission('chapter.create' as never);
  const canDelete = hasPermission('chapter.delete' as never);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const loadData = useCallback(async () => {
    if (!novelId) {
      setStatus('not-found');
      return;
    }
    setStatus('loading');
    try {
      // 加载作品标题（用于面包屑）
      const novel = await fetchNovelDetail(novelId);
      if (novel) setNovelTitle(novel.title);
      const res = await fetchChapterList({
        novelId,
        page,
        pageSize,
        searchKey,
        status: filterStatus,
        sortBy,
      });
      setDataSource(res.list);
      setTotal(res.total);
      setTotalWords(res.totalWords);
      const filtered = searchKey || filterStatus !== 'all';
      setStatus(res.list.length === 0 ? (filtered ? 'no-search-result' : 'empty') : 'ready');
    } catch {
      setStatus('error');
    }
  }, [novelId, page, pageSize, searchKey, filterStatus, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // 仅在按 index 排序时允许拖拽
    if (sortBy !== 'index') {
      message.warning('请切换为「按序号排序」后再拖拽');
      return;
    }
    const oldIndex = dataSource.findIndex((c) => c.id === active.id);
    const newIndex = dataSource.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    // 乐观更新
    const next = arrayMove(dataSource, oldIndex, newIndex);
    const original = [...dataSource];
    setDataSource(next);
    try {
      await reorderChapters(novelId!, next.map((c) => c.id));
      message.success('排序已更新');
    } catch {
      setDataSource(original);
      message.error('排序保存失败，已回滚');
    }
  };

  const handleInlineSave = async (chapter: BChapterDetail, newTitle: string) => {
    await updateChapter(chapter.id, { title: newTitle });
    setDataSource((ds) =>
      ds.map((c) => (c.id === chapter.id ? { ...c, title: newTitle, updatedAt: Date.now() } : c)),
    );
    message.success('章节标题已更新');
  };

  const handleTransition = (chapter: BChapterDetail, to: BChapterStatus) => {
    modal.confirm({
      title: `确认将「${chapter.title}」状态变更为 ${CHAPTER_STATUS_TAG[to].text}？`,
      content: '此操作将记录到审核历史。',
      onOk: async () => {
        const res = await transitionChapterStatus(chapter.id, to);
        if (res.success) {
          message.success('状态已更新');
          loadData();
        } else {
          message.error(res.reason ?? '状态更新失败');
        }
      },
    });
  };

  const handleDelete = (chapter: BChapterDetail) => {
    if (chapter.status === 'published') {
      // 已发布章节需输入标题匹配
      let inputTitle = '';
      modal.confirm({
        title: `永久删除「${chapter.title}」？`,
        content: (
          <div>
            <p style={{ color: 'var(--color-feedback-error)' }}>已发布章节删除不可恢复，请输入章节标题确认：</p>
            <Input
              placeholder={chapter.title}
              onChange={(e) => { inputTitle = e.target.value; }}
            />
          </div>
        ),
        okText: '确认删除',
        okType: 'danger',
        onOk: async () => {
          if (inputTitle !== chapter.title) {
            message.error('标题不匹配，已取消删除');
            return Promise.reject();
          }
          const res = await deleteChapter(chapter.id, inputTitle);
          if (res.success) {
            message.success('章节已删除');
            loadData();
          } else {
            message.error(res.reason ?? '删除失败');
          }
        },
      });
    } else {
      modal.confirm({
        title: `确认删除「${chapter.title}」？`,
        content: '删除后不可恢复。',
        okText: '确认删除',
        okType: 'danger',
        onOk: async () => {
          const res = await deleteChapter(chapter.id);
          if (res.success) {
            message.success('章节已删除');
            loadData();
          } else {
            message.error(res.reason ?? '删除失败');
          }
        },
      });
    }
  };

  const handleBatch = async (action: 'publish' | 'offline' | 'delete' | 'submit-audit') => {
    const ids = selectedRowKeys.map(String);
    const res = await batchOperateChapters(ids, action);
    if (res.success) {
      message.success('批量操作完成');
    } else if (res.failed && res.failed.length > 0) {
      message.warning(`部分章节状态转换非法已跳过（${res.failed.length} 条）`);
    }
    setSelectedRowKeys([]);
    loadData();
  };

  const batchActions: BatchAction[] = [
    { key: 'submit-audit', label: '批量提交审核', onClick: () => handleBatch('submit-audit') },
    { key: 'publish', label: '批量发布', onClick: () => handleBatch('publish') },
    { key: 'offline', label: '批量下架', onClick: () => handleBatch('offline') },
    {
      key: 'delete',
      label: '批量删除',
      danger: true,
      confirmTitle: '确认删除选中章节？',
      confirmContent: '删除后章节不可恢复，已发布章节需逐个标题匹配确认。',
      onClick: () => handleBatch('delete'),
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
      message.success('章节已创建');
      setCreateModalOpen(false);
      createForm.resetFields();
      loadData();
    }
  };

  const columns: TableColumnsType<BChapterDetail> = [
    {
      key: 'drag',
      title: '',
      dataIndex: 'id',
      width: 40,
      fixed: 'left',
      render: () => <DragHandle enabled={sortBy === 'index'} />,
    },
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 64,
      align: 'right',
      render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>,
    },
    {
      title: '章节标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) =>
        canEdit ? (
          <InlineEditableTitle value={title} onSave={(v) => handleInlineSave(record, v)} />
        ) : (
          <a onClick={() => openPreview(record)} style={{ color: 'var(--color-brand)' }}>{title}</a>
        ),
    },
    {
      title: '字数',
      dataIndex: 'wordCount',
      key: 'wordCount',
      width: 96,
      align: 'right',
      render: (v: number) => (
        <span style={{ fontFamily: 'var(--font-mono)' }}>{v.toLocaleString()}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 96,
      render: (s: BChapterStatus) => {
        const cfg = CHAPTER_STATUS_TAG[s];
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: 'VIP',
      dataIndex: 'isVip',
      key: 'isVip',
      width: 72,
      render: (v: boolean) =>
        v ? <Tag color="gold" style={{ color: 'var(--color-feedback-warning)' }}>VIP</Tag> : null,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 144,
      render: (v: number) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 160,
      render: (_, record) => {
        const menuItems: { key: string; label: string; icon: React.ReactNode; danger?: boolean }[] = [
          { key: 'view', label: '预览正文', icon: <EyeOutlined /> },
        ];
        if (canEdit) {
          menuItems.push({ key: 'edit', label: '编辑标题', icon: <EditOutlined /> });
          if (record.status === 'draft') {
            menuItems.push({ key: 'submit', label: '提交审核', icon: <ArrowUpOutlined /> });
          } else if (record.status === 'pending') {
            menuItems.push({ key: 'publish', label: '直接发布', icon: <ArrowUpOutlined /> });
          } else if (record.status === 'published') {
            menuItems.push({ key: 'offline', label: '下架', icon: <ArrowDownOutlined />, danger: true });
          } else if (record.status === 'offline') {
            menuItems.push({ key: 'republish', label: '重新上架', icon: <ArrowUpOutlined /> });
          }
        }
        if (canDelete) {
          menuItems.push({ key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true });
        }
        return (
          <Space size="small">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openPreview(record)}>
              预览
            </Button>
            <Dropdown menu={{ items: menuItems, onClick: ({ key }) => {
              if (key === 'view' || key === 'edit') openPreview(record);
              else if (key === 'submit') handleTransition(record, 'pending');
              else if (key === 'publish' || key === 'republish') handleTransition(record, 'published');
              else if (key === 'offline') handleTransition(record, 'offline');
              else if (key === 'delete') handleDelete(record);
            } }}>
              <Button type="link" size="small" icon={<MoreOutlined />}>更多</Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const openPreview = (chapter: BChapterDetail) => {
    setPreviewChapter(chapter);
    setDrawerOpen(true);
  };

  const breadcrumb: BPageHeaderProps['breadcrumb'] = useMemo(() => [
    { title: '内容管理' },
    { title: '作品管理', onClick: () => navigate('/novel') },
    { title: novelTitle || novelId || '作品', onClick: () => navigate(`/novel/${novelId}`) },
    { title: '章节管理' },
  ], [navigate, novelId, novelTitle]);

  if (status === 'not-found') {
    return <Result status="404" title="作品不存在" subTitle="未找到对应的作品，请返回列表。" extra={<Button onClick={() => navigate('/novel')}>返回作品列表</Button>} />;
  }

  const stats = (
    <Space size="large" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-body, 14px)' }}>
      <span>总字数：<strong style={{ fontFamily: 'var(--font-mono)' }}>{totalWords.toLocaleString()}</strong></span>
      <span>章节数：<strong style={{ fontFamily: 'var(--font-mono)' }}>{total}</strong></span>
      <span>连载状态：<Tag color="success">连载中</Tag></span>
    </Space>
  );

  return (
    <div className="b-chapter-list-page">
      <BPageHeader
        title={`《${novelTitle || '加载中'}》章节管理`}
        breadcrumb={breadcrumb}
        onBack={() => navigate(`/novel/${novelId}`)}
        extra={
          <Space>
            {stats}
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                新建章节
              </Button>
            )}
          </Space>
        }
      />

      {/* 工具栏：搜索 + 状态筛选 + 排序切换 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', gap: 'var(--space-3)' }}>
        <Space>
          <Input.Search
            placeholder="搜索章节标题"
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            onSearch={(v) => { setSearchKey(v); setPage(1); }}
            allowClear
            style={{ width: 240 }}
          />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as BChapterStatus | 'all'); setPage(1); }}
            style={{ height: 32, borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--color-border)', padding: '0 var(--space-2)' }}
          >
            {CHAPTER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Space>
        <Segmented
          value={sortBy}
          onChange={(v) => setSortBy(v as 'index' | 'updatedAt')}
          options={[
            { label: '按序号', value: 'index' },
            { label: '按更新时间', value: 'updatedAt' },
          ]}
        />
      </div>

      {/* 表格 + 拖拽 */}
      {status === 'loading' ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : status === 'error' ? (
        <Result status="error" title="加载失败" subTitle="章节列表加载出错，请重试。" extra={<Button type="primary" onClick={loadData}>重试</Button>} />
      ) : status === 'empty' || status === 'no-search-result' ? (
        <Result
          status="info"
          title={status === 'no-search-result' ? '未找到匹配章节' : '暂无章节'}
          subTitle={status === 'no-search-result' ? '尝试调整搜索关键词或筛选条件。' : '点击右上角「新建章节」开始创作。'}
          extra={status === 'empty' && canCreate ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>新建章节</Button> : undefined}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={dataSource.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <BTable
              columns={columns as never}
              dataSource={dataSource as never}
              rowKey="id"
              size="small"
              scroll={{ x: 1200, y: 600 }}
              components={{ body: { row: DraggableRow } } as never}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                pageSizeOptions: [20, 50, 100],
                showTotal: (t) => `共 ${t} 章`,
                onChange: (p, ps) => { setPage(p); setPageSize(ps); },
              }}
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                columnWidth: 40,
              } as never}
              locale={{
                emptyText: '暂无章节',
              }}
            />
          </SortableContext>
        </DndContext>
      )}

      {/* 批量操作浮层 */}
      {batchActions.length > 0 && (
        <BBatchActionBar
          selectedCount={selectedRowKeys.length}
          actions={batchActions}
          visible={selectedRowKeys.length > 0}
          onClear={() => setSelectedRowKeys([])}
        />
      )}

      {/* 章节正文预览 Drawer */}
      <Drawer
        title={previewChapter?.title}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>关闭</Button>
          </Space>
        }
      >
        {previewChapter && (
          <div>
            <Space size="large" style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
              <span>字数：<strong style={{ fontFamily: 'var(--font-mono)' }}>{previewChapter.wordCount.toLocaleString()}</strong></span>
              <span>已保存：{new Date(previewChapter.updatedAt).toLocaleString('zh-CN')}</span>
            </Space>
            <div
              style={{
                background: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: 'var(--space-4)',
                lineHeight: 1.8,
                fontSize: 'var(--font-size-body, 14px)',
                whiteSpace: 'pre-wrap',
                minHeight: 400,
              }}
            >
              {previewChapter.content}
            </div>
          </div>
        )}
      </Drawer>

      {/* 新建章节 Modal */}
      <Modal
        title="新建章节"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreateSubmit}
        okText="创建"
        cancelText="取消"
        width={640}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" initialValues={{ isVip: false }}>
          <Form.Item
            name="title"
            label="章节标题"
            rules={[
              { required: true, message: '请输入章节标题' },
              { min: 1, max: 50, message: '标题长度 1-50 字' },
            ]}
          >
            <Input placeholder="如：第 61 章 风云再起" maxLength={50} showCount />
          </Form.Item>
          <Form.Item
            name="content"
            label="章节正文"
            rules={[
              { required: true, message: '请输入章节正文' },
              { min: 100, message: '正文至少 100 字' },
            ]}
          >
            <Input.TextArea rows={10} placeholder="请输入章节正文（至少 100 字）" showCount maxLength={10000} />
          </Form.Item>
          <Form.Item name="isVip" label="VIP 章节" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
