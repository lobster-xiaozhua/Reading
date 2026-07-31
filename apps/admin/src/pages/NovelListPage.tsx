/* ============================================================
 * P4-1 · 作品管理列表页
 * 基于 ListPageTemplate 实例化
 * 行操作 ≤3 直接显示，>3 折叠到 Dropdown（04 §9.1）
 * 批量操作含危险确认（删除二次确认，04 §9.5）
 * Source: 04 §5.1 / P4-1
 * ============================================================ */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Dropdown, Button, Space, App, Modal, Radio, Input } from 'antd';
import type { TableColumnsType } from 'antd';
import { EditOutlined, MoreOutlined, EyeOutlined, ArrowDownOutlined, ArrowUpOutlined, AuditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { BNovelDetail, BNovelStatus, OfflineReason } from '@novel/types';
import { ListPageTemplate } from '@/templates/ListPageTemplate';
import type { ListPageStatus } from '@/templates/ListPageTemplate';
import type { FilterField } from '@novel/b-end';
import type { BatchAction } from '@novel/b-end';
import {
  fetchNovelList,
  batchOperate,
  submitForAudit,
  approveNovel,
  shelveNovel,
  reshelveNovel,
  NOVEL_CATEGORIES,
  NOVEL_STATUS_OPTIONS,
  OFFLINE_REASON_OPTIONS,
} from '@/api/novel-api';
import { useAuthStore } from '@/stores/authStore';

const STATUS_TAG_MAP: Record<BNovelStatus, { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  pending: { color: 'processing', text: '待审核' },
  published: { color: 'success', text: '已发布' },
  offline: { color: 'error', text: '已下架' },
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  NOVEL_CATEGORIES.map((c) => [c.value, c.label]),
);

export default function NovelListPage() {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<ListPageStatus>('loading');
  const [searchKey, setSearchKey] = useState('');
  const [filterStatus, setFilterStatus] = useState<BNovelStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [advancedValues, setAdvancedValues] = useState<Record<string, unknown>>({});
  const [dataSource, setDataSource] = useState<BNovelDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  // P8-3 下架原因 Modal 状态
  const [shelveModalOpen, setShelveModalOpen] = useState(false);
  const [shelveTargetIds, setShelveTargetIds] = useState<string[]>([]);
  const [shelveReason, setShelveReason] = useState<OfflineReason>('operation-adjust');
  const [shelveComment, setShelveComment] = useState('');
  const [shelveSubmitting, setShelveSubmitting] = useState(false);
  const { message } = App.useApp();

  const canCreate = hasPermission('novel.create' as never);

  const loadData = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetchNovelList({
        page,
        pageSize,
        searchKey,
        status: filterStatus,
        category: filterCategory,
      });
      setDataSource(res.list);
      setTotal(res.total);
      setStatus(res.list.length === 0 ? (searchKey || filterStatus !== 'all' || filterCategory !== 'all' ? 'no-search-result' : 'empty') : 'idle');
    } catch {
      setStatus('error');
    }
  }, [page, pageSize, searchKey, filterStatus, filterCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (v: string) => {
    setSearchKey(v);
    setPage(1);
  };

  const handleReset = () => {
    setSearchKey('');
    setFilterStatus('all');
    setFilterCategory('all');
    setAdvancedValues({});
    setPage(1);
  };

  const handleBatch = async (action: 'publish' | 'offline' | 'delete') => {
    const ids = selectedRowKeys.map(String);
    await batchOperate(ids, action);
    setSelectedRowKeys([]);
    loadData();
  };

  // P8-3-1 提交审核：draft → pending
  const handleBatchSubmitAudit = async () => {
    const ids = selectedRowKeys.map(String);
    const res = await submitForAudit(ids);
    if (res.success) {
      message.success(`已提交 ${ids.length} 条作品审核`);
      setSelectedRowKeys([]);
      loadData();
    } else {
      message.error(`提交失败：${res.failed?.map((f) => f.reason).join('；')}`);
    }
  };

  // P8-3-1 审核通过上架：pending → published
  const handleBatchApprove = async () => {
    const ids = selectedRowKeys.map(String);
    const res = await approveNovel(ids);
    if (res.success) {
      message.success(`已通过 ${ids.length} 条作品审核`);
      setSelectedRowKeys([]);
      loadData();
    } else {
      message.error(`审核失败：${res.failed?.map((f) => f.reason).join('；')}`);
    }
  };

  // P8-3-2 下架：打开原因 Modal
  const handleBatchShelve = () => {
    setShelveTargetIds(selectedRowKeys.map(String));
    setShelveReason('operation-adjust');
    setShelveComment('');
    setShelveModalOpen(true);
  };

  // P8-3-2 下架确认：published → offline（记录原因）
  const handleShelveConfirm = async () => {
    setShelveSubmitting(true);
    try {
      const res = await shelveNovel(shelveTargetIds, shelveReason, shelveComment);
      if (res.success) {
        message.success(`已下架 ${shelveTargetIds.length} 条作品`);
        setShelveModalOpen(false);
        setSelectedRowKeys([]);
        loadData();
      } else {
        message.error(`下架失败：${res.failed?.map((f) => f.reason).join('；')}`);
      }
    } finally {
      setShelveSubmitting(false);
    }
  };

  const batchActions: BatchAction[] = [
    { key: 'submit-audit', label: '提交审核', onClick: handleBatchSubmitAudit },
    { key: 'approve', label: '审核通过', onClick: handleBatchApprove },
    { key: 'publish', label: '批量上架', onClick: () => handleBatch('publish') },
    { key: 'offline', label: '批量下架', danger: true, onClick: handleBatchShelve },
    {
      key: 'delete',
      label: '批量删除',
      danger: true,
      confirmTitle: '确认删除选中作品？',
      confirmContent: '删除后作品及其章节将无法恢复，此操作不可撤销。',
      onClick: () => handleBatch('delete'),
    },
  ];

  const columns: TableColumnsType<BNovelDetail> = [
    {
      title: '书名',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (title: string, record) => (
        <a onClick={() => navigate(`/novel/${record.id}`)} style={{ color: 'var(--color-brand)' }}>
          {title}
        </a>
      ),
    },
    { title: '作者', dataIndex: 'author', key: 'author', width: 120 },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (cat: string) => CATEGORY_LABEL[cat] ?? cat,
    },
    {
      title: '字数',
      dataIndex: 'wordCount',
      key: 'wordCount',
      width: 120,
      align: 'right',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: BNovelStatus) => {
        const cfg = STATUS_TAG_MAP[s];
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      width: 180,
      render: (v: number) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 160,
      render: (_, record) => {
        const canEdit = hasPermission('novel.edit' as never);
        // P8-3 行级操作按状态机分流
        const statusAction =
          record.status === 'draft'
            ? { key: 'submit-audit', label: '提交审核', icon: <AuditOutlined /> }
            : record.status === 'pending'
              ? { key: 'approve', label: '审核通过', icon: <CheckCircleOutlined /> }
              : record.status === 'published'
                ? { key: 'offline', label: '下架', icon: <ArrowDownOutlined />, danger: true }
                : { key: 'reshelve', label: '恢复上架', icon: <ArrowUpOutlined /> };
        const menuItems = [
          { key: 'view', label: '查看详情', icon: <EyeOutlined /> },
          ...(canEdit ? [{ key: 'edit', label: '编辑', icon: <EditOutlined /> }] : []),
          statusAction,
        ];
        return (
          <Space size="small">
            {canEdit && (
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/novel/${record.id}/edit`)}>
                编辑
              </Button>
            )}
            <Dropdown menu={{ items: menuItems, onClick: ({ key }) => {
              if (key === 'view') navigate(`/novel/${record.id}`);
              else if (key === 'edit') navigate(`/novel/${record.id}/edit`);
              else if (key === 'submit-audit') {
                submitForAudit([record.id]).then((res) => {
                  if (res.success) { message.success('已提交审核'); loadData(); }
                  else { message.error(`提交失败：${res.failed?.map((f) => f.reason).join('；')}`); }
                });
              } else if (key === 'approve') {
                approveNovel([record.id]).then((res) => {
                  if (res.success) { message.success('审核通过，已上架'); loadData(); }
                  else { message.error(`审核失败：${res.failed?.map((f) => f.reason).join('；')}`); }
                });
              } else if (key === 'offline') {
                // P8-3-2 行级下架也走原因 Modal
                setShelveTargetIds([record.id]);
                setShelveReason('operation-adjust');
                setShelveComment('');
                setShelveModalOpen(true);
              } else if (key === 'reshelve') {
                reshelveNovel([record.id]).then((res) => {
                  if (res.success) { message.success('已恢复上架'); loadData(); }
                  else { message.error(`恢复失败：${res.failed?.map((f) => f.reason).join('；')}`); }
                });
              }
            }}}>
              <Button type="link" size="small" icon={<MoreOutlined />}>
                更多
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const filters: FilterField[] = [
    {
      name: 'status',
      label: '状态',
      control: (
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as BNovelStatus | 'all'); setPage(1); }}
          style={{ height: 32, borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--color-border)', padding: '0 var(--space-2)' }}
        >
          {NOVEL_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ),
    },
    {
      name: 'category',
      label: '分类',
      control: (
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          style={{ height: 32, borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--color-border)', padding: '0 var(--space-2)' }}
        >
          {NOVEL_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<BNovelDetail>
        title="作品管理"
        breadcrumb={[
          { title: '内容管理' },
          { title: '作品管理' },
        ]}
        permission="novel.list"
        status={status}
        onRetry={loadData}
        searchKey={searchKey}
        onSearch={handleSearch}
        searchPlaceholder="搜索书名或作者"
        filters={filters}
        advancedFilters={[]}
        advancedValues={advancedValues}
        onAdvancedConfirm={setAdvancedValues}
        onReset={handleReset}
        columns={columns as never}
        dataSource={dataSource}
        rowKey="id"
        loading={status === 'loading'}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (t: number) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
        onPaginationChange={(p, ps) => { setPage(p); setPageSize(ps); }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        selectedCount={selectedRowKeys.length}
        batchActions={batchActions}
        onClearSelection={() => setSelectedRowKeys([])}
        onCreate={canCreate ? () => navigate('/novel/create') : undefined}
        canCreate={canCreate}
      />
      {/* P8-3-2 下架原因 Modal */}
      <Modal
        open={shelveModalOpen}
        title={`批量下架作品（${shelveTargetIds.length} 条）`}
        okText="确认下架"
        cancelText="取消"
        okType="danger"
        confirmLoading={shelveSubmitting}
        onOk={handleShelveConfirm}
        onCancel={() => setShelveModalOpen(false)}
      >
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <p style={{ marginBottom: 'var(--space-2)' }}>请选择下架原因（必填）：</p>
          <Radio.Group
            value={shelveReason}
            onChange={(e) => setShelveReason(e.target.value as OfflineReason)}
            buttonStyle="solid"
          >
            <Space direction="vertical">
              {OFFLINE_REASON_OPTIONS.map((opt) => (
                <Radio key={opt.value} value={opt.value}>
                  <Tag color={opt.color} style={{ marginRight: 'var(--space-1)' }}>{opt.label}</Tag>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </div>
        <div>
          <p style={{ marginBottom: 'var(--space-2)' }}>备注说明（选填）：</p>
          <Input.TextArea
            value={shelveComment}
            onChange={(e) => setShelveComment(e.target.value)}
            rows={4}
            placeholder="请输入下架原因的补充说明..."
            maxLength={200}
            showCount
          />
        </div>
      </Modal>
    </>
  );
}
