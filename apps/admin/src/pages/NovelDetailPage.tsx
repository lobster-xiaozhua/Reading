import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<DetailCardStatus>('loading');
  const [novel, setNovel] = useState<BNovelDetail | null>(null);
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

  const handleWorkflowAction = () => {
    if (!novel) return;
    if (novel.status === 'draft') {
      submitForAudit([novel.id]).then((res) => {
        if (res.success) { message.success(t('novel:message.submitted')); loadDetail(); }
        else { message.error(t('novel:message.submitFailed', { msg: res.failed?.map((f) => f.reason).join('；') })); }
      });
    } else if (novel.status === 'pending') {
      approveNovel([novel.id]).then((res) => {
        if (res.success) { message.success(t('novel:message.approved')); loadDetail(); }
        else { message.error(t('novel:message.approveFailed', { msg: res.failed?.map((f) => f.reason).join('；') })); }
      });
    } else if (novel.status === 'published') {
      setShelveReason('operation-adjust');
      setShelveComment('');
      setShelveModalOpen(true);
    } else if (novel.status === 'offline') {
      reshelveNovel([novel.id]).then((res) => {
        if (res.success) { message.success(t('novel:message.reshelved')); loadDetail(); }
        else { message.error(t('novel:message.reshelveFailed', { msg: res.failed?.map((f) => f.reason).join('；') })); }
      });
    }
  };

  const handleShelveConfirm = async () => {
    if (!novel) return;
    setShelveSubmitting(true);
    try {
      const res = await shelveNovel([novel.id], shelveReason, shelveComment);
      if (res.success) {
        message.success(t('novel:message.offlined'));
        setShelveModalOpen(false);
        loadDetail();
      } else {
        message.error(t('novel:message.offlineFailed', { msg: res.failed?.map((f) => f.reason).join('；') }));
      }
    } finally {
      setShelveSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!novel) return;
    modal.confirm({
      title: t('novel:deleteConfirm.title'),
      content: t('novel:deleteConfirm.content', { title: novel.title }),
      okText: t('novel:deleteConfirm.confirm'),
      okType: 'danger',
      onOk: () => batchOperate([novel.id], 'delete').then(() => navigate('/novel')),
    });
  };

  const workflowBtn = novel ? (() => {
    switch (novel.status) {
      case 'draft': return { text: t('novel:action.submitAudit'), icon: <AuditOutlined /> };
      case 'pending': return { text: t('novel:action.approve'), icon: <CheckCircleOutlined /> };
      case 'published': return { text: t('novel:action.offline'), icon: <ArrowDownOutlined /> };
      case 'offline': return { text: t('novel:action.reshelve'), icon: <ArrowUpOutlined /> };
    }
  })() : null;

  const headerExtra = novel ? (
    <Space>
      {canEdit && (
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/novel/${novel.id}/edit`)}>
          {t('novel:action.edit')}
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
        {t('novel:action.delete')}
      </Button>
    </Space>
  ) : undefined;

  const WORKFLOW_STEPS = [
    { title: t('novelDetail:steps.draft'), description: t('novelDetail:steps.draftDesc') },
    { title: t('novelDetail:steps.pending'), description: t('novelDetail:steps.pendingDesc') },
    { title: t('novelDetail:steps.published'), description: t('novelDetail:steps.publishedDesc') },
  ];
  const workflowCurrent = novel
    ? novel.status === 'draft' ? 0
      : novel.status === 'pending' ? 1
        : 2
    : 0;
  const workflowStatus = novel?.status === 'offline' ? 'error' : 'process';

  const basicItems: DescItem[] = novel
    ? [
        { key: 'title', label: t('novelDetail:info.title'), children: novel.title },
        { key: 'author', label: t('novelDetail:info.author'), children: novel.author },
        { key: 'category', label: t('novelDetail:info.category'), children: CATEGORY_LABEL[novel.category] ?? novel.category },
        { key: 'tags', label: t('novelDetail:info.tags'), children: novel.tags.map((t: string) => <Tag key={t}>{t}</Tag>) },
        { key: 'wordCount', label: t('novelDetail:info.wordCount'), children: novel.wordCount.toLocaleString() },
        { key: 'intro', label: t('novelDetail:info.intro'), span: 2, children: novel.intro },
        { key: 'createdAt', label: t('novelDetail:info.createdAt'), children: new Date(novel.createdAt).toLocaleString('zh-CN') },
        { key: 'publishedAt', label: t('novelDetail:info.shelvedAt'), children: novel.publishedAt ? new Date(novel.publishedAt).toLocaleString('zh-CN') : t('novelDetail:info.notShelved') },
        {
          key: 'workflow',
          label: t('novelDetail:info.statusFlow'),
          span: 2,
          children: (
            <Steps
              size="small"
              current={workflowCurrent}
              status={workflowStatus}
              items={novel.status === 'offline'
                ? [...WORKFLOW_STEPS, { title: t('novelDetail:steps.offline'), description: novel.reason ?? t('novelDetail:steps.offline') }]
                : WORKFLOW_STEPS}
            />
          ),
        },
        ...(novel.status === 'offline' && novel.shelvedAt
          ? [{ key: 'shelvedAt', label: t('novelDetail:info.offlinedAt'), children: new Date(novel.shelvedAt).toLocaleString('zh-CN') }]
          : []),
        ...(novel.status === 'offline' && novel.reason
          ? [{ key: 'offlineReason', label: t('novelDetail:info.offlineReason'), span: 2, children: <Tag color="error">{novel.reason}</Tag> }]
          : []),
      ]
    : [];

  const statsContent = novel ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{t('novelDetail:stats.readCount')}</span>
        <strong>{(novelStats?.readCount ?? 0).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{t('novelDetail:stats.favCount')}</span>
        <strong>{(novelStats?.favCount ?? 0).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{t('novelDetail:stats.ticketCount')}</span>
        <strong>{(novelStats?.ticketCount ?? 0).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>{t('novelDetail:stats.rating')}</span>
        <strong>{novelStats?.rating ? novelStats.rating.toFixed(1) : '-'}</strong>
      </div>
      <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
        <Progress type="circle" percent={novelStats?.completionRate ?? 0} size={100} />
        <div style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)' }}>
          {t('novelDetail:stats.completionRate')}
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <>
      <DetailCardTemplate
        title={novel?.title ?? t('novelDetail:title')}
        breadcrumb={[
          { title: t('novelDetail:breadcrumb.content') },
          { title: t('novelDetail:breadcrumb.novel'), onClick: () => navigate('/novel') },
          { title: novel?.title ?? t('novelDetail:breadcrumb.detail') },
        ]}
        status={status}
        offlineMessage={novel?.reason ? t('novelDetail:offlinedNotice', { reason: novel.reason }) : undefined}
        onBack={() => navigate('/novel')}
        extra={headerExtra}
        basicItems={basicItems}
        statsContent={statsContent}
        chapterTitle={t('novelDetail:chapterSection.title')}
        chapterContent={
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            <Button type="primary" onClick={() => navigate(`/chapter/${novel?.id}`)}>
              {t('novelDetail:chapterSection.enter')}
            </Button>
            <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
              {t('novelDetail:chapterSection.placeholder')}
            </p>
          </div>
        }
        auditHistory={auditHistory}
        comments={comments}
      />
      <Modal
        open={shelveModalOpen}
        title={t('novel:action.offline')}
        okText={t('novel:offline.confirm')}
        cancelText={t('novel:offline.cancel')}
        okType="danger"
        confirmLoading={shelveSubmitting}
        onOk={handleShelveConfirm}
        onCancel={() => setShelveModalOpen(false)}
      >
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <p style={{ marginBottom: 'var(--space-2)' }}>{t('novel:offline.reasonRequired')}</p>
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
          <p style={{ marginBottom: 'var(--space-2)' }}>{t('novel:offline.remark')}</p>
          <Input.TextArea
            value={shelveComment}
            onChange={(e) => setShelveComment(e.target.value)}
            rows={4}
            placeholder={t('novel:offline.remarkPlaceholder')}
            maxLength={200}
            showCount
          />
        </div>
      </Modal>
    </>
  );
}