/* ============================================================
 * P4-3 · 作品详情卡片页
 * 基于 DetailCardTemplate 实例化
 * 基本信息 + 数据统计（Progress circle 完读率）+ 章节卡 + 审核 Timeline + 评论 Top10
 * Source: 04 §5.3 / P4-3
 * ============================================================ */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, Progress, Tag, App, Steps, Modal, Radio, Input } from 'antd';
import { EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, AuditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { BNovelDetail, OfflineReason } from '@novel/types';
import { DetailCardTemplate } from '@/templates/DetailCardTemplate';
import type { DetailCardStatus, DescItem, AuditHistoryItem, CommentItem } from '@/templates/DetailCardTemplate';
import {
  fetchNovelDetail,
  batchOperate,
  submitForAudit,
  approveNovel,
  shelveNovel,
  reshelveNovel,
  OFFLINE_REASON_OPTIONS,
  NOVEL_CATEGORIES,
} from '@/api/novel-api';
import { http } from '@/api/http';
import { useAuthStore } from '@/stores/authStore';

const CATEGORY_LABEL = Object.fromEntries(NOVEL_CATEGORIES.map((c) => [c.value, c.label]));

export default function NovelDetailPage() {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<DetailCardStatus>('loading');
  const [novel, setNovel] = useState<BNovelDetail | null>(null);
  // P8-3 下架原因 Modal 状态
  const [shelveModalOpen, setShelveModalOpen] = useState(false);
  const [shelveReason, setShelveReason] = useState<OfflineReason>('operation-adjust');
  const [shelveComment, setShelveComment] = useState('');
  const [shelveSubmitting, setShelveSubmitting] = useState(false);
  
  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [novelStats, setNovelStats] = useState<{
    readCount: number; favCount: number; ticketCount: number;
    rating: number; completionRate: number;
  } | null>(null);

  const loadDetail = useCallback(async () => {
    if (!novelId) return;
    setStatus('loading');
    try {
      const [data, stats, auditData, commentData] = await Promise.all([
        fetchNovelDetail(novelId),
        http.get<{
          readCount: number; favCount: number; ticketCount: number;
          rating: number; completionRate: number;
        }>(`/novels/${novelId}/stats`).catch(() => null),
        http.get<{ id: string; operatorName: string; result: string; comment: string; createdAt: number }[]>(`/novels/${novelId}/audit-history`).then((items) => items.map((item) => ({
        time: item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '未知',
        operator: item.operatorName,
        result: item.result as 'approve' | 'revise' | 'reject',
        comment: item.comment,
      }))).catch(() => [] as AuditHistoryItem[]),
        http.get<CommentItem[]>(`/novels/${novelId}/comments`).catch(() => []),
      ]);
      if (!data) {
        setStatus('not-found');
        return;
      }
      setNovel(data);
      setNovelStats(stats);
      setAuditHistory(auditData);
      setComments(commentData);
      setStatus(data.status === 'offline' ? 'offline' : 'ready');
    } catch {
      setStatus('not-found');
    }
  }, [novelId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const canEdit = hasPermission('novel.edit');

  // P8-3 按状态机分流的工作流操作
  const handleWorkflowAction = () => {
    if (!novel) return;
    if (novel.status === 'draft') {
      submitForAudit([novel.id]).then((res) => {
        if (res.success) { message.success('已提交审核'); loadDetail(); }
        else { message.error(`提交失败：${res.failed?.map((f) => f.reason).join('；')}`); }
      });
    } else if (novel.status === 'pending') {
      approveNovel([novel.id]).then((res) => {
        if (res.success) { message.success('审核通过，已上架'); loadDetail(); }
        else { message.error(`审核失败：${res.failed?.map((f) => f.reason).join('；')}`); }
      });
    } else if (novel.status === 'published') {
      // 打开下架原因 Modal
      setShelveReason('operation-adjust');
      setShelveComment('');
      setShelveModalOpen(true);
    } else if (novel.status === 'offline') {
      reshelveNovel([novel.id]).then((res) => {
        if (res.success) { message.success('已恢复上架'); loadDetail(); }
        else { message.error(`恢复失败：${res.failed?.map((f) => f.reason).join('；')}`); }
      });
    }
  };

  // P8-3-2 下架确认
  const handleShelveConfirm = async () => {
    if (!novel) return;
    setShelveSubmitting(true);
    try {
      const res = await shelveNovel([novel.id], shelveReason, shelveComment);
      if (res.success) {
        message.success('已下架');
        setShelveModalOpen(false);
        loadDetail();
      } else {
        message.error(`下架失败：${res.failed?.map((f) => f.reason).join('；')}`);
      }
    } finally {
      setShelveSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!novel) return;
    modal.confirm({
      title: '永久删除该作品？',
      content: `此操作不可撤销。作品《${novel.title}》及其所有章节将被永久删除。`,
      okText: '确认删除',
      okType: 'danger',
      onOk: () => batchOperate([novel.id], 'delete').then(() => navigate('/novel')),
    });
  };

  // P8-3 按状态生成按钮文案与图标
  const workflowBtn = novel ? (() => {
    switch (novel.status) {
      case 'draft': return { text: '提交审核', icon: <AuditOutlined /> };
      case 'pending': return { text: '审核通过', icon: <CheckCircleOutlined /> };
      case 'published': return { text: '下架', icon: <ArrowDownOutlined /> };
      case 'offline': return { text: '恢复上架', icon: <ArrowUpOutlined /> };
    }
  })() : null;

  const headerExtra = novel ? (
    <Space>
      {canEdit && (
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/novel/${novel.id}/edit`)}>
          编辑
        </Button>
      )}
      {workflowBtn && (
        <Button
          icon={workflowBtn.icon}
          danger={novel.status === 'published'}
          onClick={handleWorkflowAction}
        >
          {workflowBtn.text}
        </Button>
      )}
      <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
        删除
      </Button>
    </Space>
  ) : undefined;

  // P8-3 工作流状态映射（draft=0, pending=1, published=2, offline=2+error）
  const WORKFLOW_STEPS = [
    { title: '草稿', description: '创建作品' },
    { title: '待审核', description: '提交审核中' },
    { title: '已发布', description: 'C 端可阅读' },
  ];
  const workflowCurrent = novel
    ? novel.status === 'draft' ? 0
      : novel.status === 'pending' ? 1
        : 2
    : 0;
  const workflowStatus = novel?.status === 'offline' ? 'error' : 'process';

  const basicItems: DescItem[] = novel
    ? [
        { key: 'title', label: '书名', children: novel.title },
        { key: 'author', label: '作者', children: novel.author },
        { key: 'category', label: '分类', children: CATEGORY_LABEL[novel.category] ?? novel.category },
        { key: 'tags', label: '标签', children: novel.tags.map((t: string) => <Tag key={t}>{t}</Tag>) },
        { key: 'wordCount', label: '总字数', children: novel.wordCount.toLocaleString() },
        { key: 'intro', label: '简介', span: 2, children: novel.intro },
        { key: 'createdAt', label: '创建时间', children: new Date(novel.createdAt).toLocaleString('zh-CN') },
        { key: 'publishedAt', label: '上架时间', children: novel.publishedAt ? new Date(novel.publishedAt).toLocaleString('zh-CN') : '未上架' },
        // P8-3 工作流状态展示
        {
          key: 'workflow',
          label: '状态流转',
          span: 2,
          children: (
            <Steps
              size="small"
              current={workflowCurrent}
              status={workflowStatus}
              items={novel.status === 'offline'
                ? [...WORKFLOW_STEPS, { title: '已下架', description: novel.reason ?? '已下架' }]
                : WORKFLOW_STEPS}
            />
          ),
        },
        // P8-3 下架原因与时间
        ...(novel.status === 'offline' && novel.shelvedAt
          ? [{ key: 'shelvedAt', label: '下架时间', children: new Date(novel.shelvedAt).toLocaleString('zh-CN') }]
          : []),
        ...(novel.status === 'offline' && novel.reason
          ? [{ key: 'offlineReason', label: '下架原因', span: 2, children: <Tag color="error">{novel.reason}</Tag> }]
          : []),
      ]
    : [];

  const statsContent = novel ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>阅读量</span>
        <strong>{(novelStats?.readCount ?? 0).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>收藏数</span>
        <strong>{(novelStats?.favCount ?? 0).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>月票</span>
        <strong>{(novelStats?.ticketCount ?? 0).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>评分</span>
        <strong>{novelStats?.rating ? novelStats.rating.toFixed(1) : '-'}</strong>
      </div>
      <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
        <Progress type="circle" percent={novelStats?.completionRate ?? 0} size={100} />
        <div style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)' }}>
          完读率
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <>
      <DetailCardTemplate
        title={novel?.title ?? '作品详情'}
        breadcrumb={[
          { title: '内容管理' },
          { title: '作品管理', onClick: () => navigate('/novel') },
          { title: novel?.title ?? '详情' },
        ]}
        status={status}
        offlineMessage={novel?.reason ? `该内容已下架，原因：${novel.reason}` : undefined}
        onBack={() => navigate('/novel')}
        extra={headerExtra}
        basicItems={basicItems}
        statsContent={statsContent}
        chapterTitle="章节管理"
        chapterContent={
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            <Button type="primary" onClick={() => navigate(`/chapter/${novel?.id}`)}>
              进入章节管理
            </Button>
            <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
              章节列表、排序、编辑将在 P5-1 章节管理页实现
            </p>
          </div>
        }
        auditHistory={auditHistory}
        comments={comments}
      />
      {/* P8-3-2 下架原因 Modal */}
      <Modal
        open={shelveModalOpen}
        title="下架作品"
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
