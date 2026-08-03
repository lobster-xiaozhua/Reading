import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  List,
  Tag,
  Input,
  Select,
  Button,
  Space,
  Empty,
  Result,
  Skeleton,
  Timeline,
  Tooltip,
  App,
  Badge,
} from 'antd';
import type { AuditLevel, AuditResult, RejectReason } from '@novel/types';
import { BPageHeader } from '@novel/b-end';
import type { BPageHeaderProps } from '@novel/b-end';
import { useAuthStore } from '@/stores/authStore';
import {
  fetchAuditQueue,
  fetchAuditHistory,
  submitAudit,
  splitContentBySensitive,
  AUDIT_LEVEL_OPTIONS,
  AUDIT_LEVEL_LABEL,
  SENSITIVE_LEVEL_CONFIG,
  REJECT_REASON_OPTIONS,
} from '@/api/audit-api';
import type { AuditItem, AuditHistoryEntry, SensitiveHit } from '@/api/audit-api';

const { TextArea } = Input;

type PageStatus = 'loading' | 'ready' | 'empty' | 'error';

export default function AuditWorkbenchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<PageStatus>('loading');
  const [queue, setQueue] = useState<AuditItem[]>([]);
  const [filterLevel, setFilterLevel] = useState<AuditLevel | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<AuditHistoryEntry[]>([]);
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState<RejectReason | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayProcessed, setTodayProcessed] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const hitRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  const canApprove = hasPermission('audit.approve' as never);
  const canReject = hasPermission('audit.reject' as never);

  const loadData = useCallback(async () => {
    setStatus('loading');
    try {
      const { list, stats } = await fetchAuditQueue(filterLevel);
      setQueue(list);
      setPendingCount(stats.pendingCount);
      setTodayProcessed(stats.todayProcessed);
      if (list.length > 0 && !list.find((i) => i.id === selectedId)) {
        setSelectedId(list[0].id);
      } else if (list.length === 0) {
        setSelectedId(null);
      }
      setStatus(list.length === 0 ? 'empty' : 'ready');
    } catch {
      setStatus('error');
    }
  }, [filterLevel, selectedId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedId) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const h = await fetchAuditHistory(selectedId);
      if (!cancelled) setHistory(h);
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  const currentItem = useMemo(
    () => queue.find((i) => i.id === selectedId) ?? null,
    [queue, selectedId],
  );

  const handleSubmit = async (result: AuditResult) => {
    if (!currentItem) return;
    if (result === 'reject') {
      if (!rejectReason) {
        message.error(t('audit:message.noRejectReason'));
        return;
      }
      if (comment.trim().length < 10) {
        message.error(t('audit:message.commentTooShort'));
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await submitAudit({
        ids: [currentItem.id],
        result,
        comment: comment.trim(),
        rejectReason: result === 'reject' ? rejectReason : undefined,
      });
      const actionText = result === 'approve' ? t('audit:resultLabel.approved') : result === 'revise' ? t('audit:resultLabel.revise') : t('audit:resultLabel.rejected');
      message.success(t('audit:message.completed', { action: actionText }));
      setComment('');
      setRejectReason(undefined);
      if (res.nextId) {
        setSelectedId(res.nextId);
      }
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSensitiveClick = (hit: SensitiveHit) => {
    const el = hitRefs.current.get(hit.text + hit.offset);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = `2px solid ${SENSITIVE_LEVEL_CONFIG[hit.level].color}`;
      setTimeout(() => {
        el.style.outline = 'none';
      }, 2000);
    }
  };

  const breadcrumb: BPageHeaderProps['breadcrumb'] = [
    { title: t('audit:breadcrumb') },
    { title: t('audit:title') },
  ];

  const segments = useMemo(() => {
    if (!currentItem) return [];
    return splitContentBySensitive(currentItem.content, currentItem.sensitiveHits);
  }, [currentItem]);

  return (
    <div className="b-audit-workbench-page">
      <BPageHeader
        title={t('audit:workbenchTitle')}
        breadcrumb={breadcrumb}
        onBack={() => navigate('/workbench')}
        extra={
          <Space size="large">
            <Badge count={pendingCount} overflowCount={99} offset={[0, 0]}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{t('audit:stats.pending')}</span>
            </Badge>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {t('audit:stats.todayProcessed')}<strong style={{ fontFamily: 'var(--font-mono)' }}>{todayProcessed}</strong> {t('audit:stats.unit')}
            </span>
          </Space>
        }
      />

      {status === 'error' ? (
        <Result status="error" title={t('common:loading')} subTitle={t('common:empty')} extra={<Button type="primary" onClick={loadData}>{t('common:retry')}</Button>} />
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-4)', minHeight: 600 }}>
          <Card
            title={t('audit:leftPanel')}
            extra={
              <Select
                value={filterLevel}
                onChange={(v) => { setFilterLevel(v); }}
                options={AUDIT_LEVEL_OPTIONS}
                style={{ width: 120 }}
              />
            }
            style={{ width: '40%', overflow: 'auto' }}
            styles={{ body: { padding: 0 } }}
          >
            {status === 'loading' ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : queue.length === 0 ? (
              <Empty description={t('audit:empty')} style={{ padding: 'var(--space-8)' }} />
            ) : (
              <List
                dataSource={queue}
                split
                renderItem={(item) => {
                  const levelCfg = AUDIT_LEVEL_LABEL[item.level];
                  const isSelected = item.id === selectedId;
                  return (
                    <List.Item
                      onClick={() => setSelectedId(item.id)}
                      style={{
                        cursor: 'pointer',
                        padding: 'var(--space-3) var(--space-4)',
                        background: isSelected ? 'var(--color-brand-bg)' : undefined,
                        borderLeft: isSelected ? `3px solid var(--color-brand)` : '3px solid transparent',
                        transition: 'background var(--dur-fast) var(--ease-out)',
                      }}
                    >
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                          <strong style={{ fontSize: 'var(--font-size-body, 14px)' }}>{item.chapterTitle}</strong>
                          <Tag color={levelCfg.color}>{levelCfg.text}</Tag>
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)' }}>
                          《{item.novelTitle}》 · {item.author}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-caption, 13px)' }}>
                          <span>{item.wordCount.toLocaleString()} {t('audit:wordSuffix')}</span>
                          {item.sensitiveHits.length > 0 && (
                            <span style={{ color: 'var(--color-feedback-error)' }}>
                              {t('audit:sensitiveHit', { count: item.sensitiveHits.length })}
                            </span>
                          )}
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {status === 'loading' ? (
              <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
            ) : !currentItem ? (
              <Card>
                <Empty description={t('audit:emptySelect')} style={{ padding: 'var(--space-8)' }} />
              </Card>
            ) : (
              <>
                <Card
                  title={
                    <Space>
                      <span>{currentItem.chapterTitle}</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)', fontWeight: 'normal' }}>
                        《{currentItem.novelTitle}》 · {currentItem.author} · {currentItem.wordCount.toLocaleString()} {t('audit:wordSuffix')}
                      </span>
                    </Space>
                  }
                  extra={<Tag color={AUDIT_LEVEL_LABEL[currentItem.level].color}>{AUDIT_LEVEL_LABEL[currentItem.level].text}</Tag>}
                >
                  {currentItem.sensitiveHits.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-feedback-error-bg)', borderRadius: 'var(--radius-md, 8px)' }}>
                      <div style={{ marginBottom: 'var(--space-2)', color: 'var(--color-feedback-error)', fontWeight: 600 }}>
                        {t('audit:sensitiveTitle', { count: currentItem.sensitiveHits.length })}
                      </div>
                      <Space wrap>
                        {currentItem.sensitiveHits.map((hit, idx) => {
                          const cfg = SENSITIVE_LEVEL_CONFIG[hit.level];
                          return (
                            <Tooltip key={idx} title={`${cfg.label}：${hit.suggestion}`}>
                              <Tag
                                style={{
                                  color: cfg.color,
                                  background: cfg.bg,
                                  borderColor: cfg.color,
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleSensitiveClick(hit)}
                              >
                                {hit.text} · {cfg.label}
                              </Tag>
                            </Tooltip>
                          );
                        })}
                      </Space>
                    </div>
                  )}

                  <div
                    ref={contentRef}
                    style={{
                      background: 'var(--color-bg-subtle)',
                      borderRadius: 'var(--radius-md, 8px)',
                      padding: 'var(--space-4)',
                      maxHeight: 360,
                      overflowY: 'auto',
                      lineHeight: 1.8,
                      fontSize: 'var(--font-size-body, 14px)',
                    }}
                  >
                    {segments.map((seg, idx) =>
                      seg.isHit && seg.hit ? (
                        <Tooltip key={idx} title={`${SENSITIVE_LEVEL_CONFIG[seg.hit.level].label}：${seg.hit.suggestion}`}>
                          <span
                            ref={(el) => {
                              if (el) hitRefs.current.set(seg.hit!.text + seg.hit!.offset, el);
                            }}
                            style={{
                              background: SENSITIVE_LEVEL_CONFIG[seg.hit.level].bg,
                              color: SENSITIVE_LEVEL_CONFIG[seg.hit.level].color,
                              textDecoration: 'underline',
                              textDecorationStyle: 'wavy',
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-xs, 2px)',
                              padding: '0 2px',
                            }}
                          >
                            {seg.text}
                          </span>
                        </Tooltip>
                      ) : (
                        <span key={idx}>{seg.text}</span>
                      ),
                    )}
                  </div>
                </Card>

                {history.length > 0 && (
                  <Card title={t('audit:history')}>
                    <Timeline
                      items={history.map((h) => ({
                        color: h.result === 'approve' ? 'green' : h.result === 'reject' ? 'red' : 'blue',
                        children: (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <Tag color={h.result === 'approve' ? 'success' : h.result === 'reject' ? 'error' : 'processing'}>
                                {h.result === 'approve' ? t('audit:resultLabel.approved') : h.result === 'reject' ? t('audit:resultLabel.rejected') : t('audit:resultLabel.revise')}
                              </Tag>
                              <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)' }}>
                                {h.operator} · {h.time}
                              </span>
                            </div>
                            {h.comment && (
                              <p style={{ marginTop: 'var(--space-1)' }}>{h.comment}</p>
                            )}
                          </div>
                        ),
                      }))}
                    />
                  </Card>
                )}

                <Card title={t('audit:operation.title')}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <label style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{t('audit:operation.rejectReasonLabel')}</label>
                      <Select
                        value={rejectReason}
                        onChange={setRejectReason}
                        options={REJECT_REASON_OPTIONS}
                        placeholder={t('audit:operation.rejectReasonPlaceholder')}
                        style={{ width: 200 }}
                        allowClear
                      />
                    </div>
                    <TextArea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t('audit:operation.commentPlaceholder')}
                      rows={3}
                      maxLength={500}
                      showCount
                    />
                    <Space>
                      <Button
                        type="primary"
                        loading={submitting}
                        onClick={() => handleSubmit('approve')}
                        disabled={!canApprove}
                      >
                        {t('audit:operation.approve')}
                      </Button>
                      <Button
                        loading={submitting}
                        onClick={() => handleSubmit('revise')}
                        disabled={!canApprove}
                      >
                        {t('audit:operation.revise')}
                      </Button>
                      <Button
                        danger
                        loading={submitting}
                        onClick={() => handleSubmit('reject')}
                        disabled={!canReject || !rejectReason || comment.trim().length < 10}
                      >
                        {t('audit:operation.reject')}
                      </Button>
                    </Space>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}