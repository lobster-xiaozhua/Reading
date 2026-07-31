/* ============================================================
 * P5-2 · 内容审核工作流页
 * 分屏布局：左 40% 待审列表 + 右 60% 内容预览 + 审核操作栏
 * 敏感词高亮（error-bg 底 + error 字 + 下划线 + hover Tooltip）
 * 审核流程：初审 → 复审 → 终审；驳回退回作者
 * Source: 04 §5.6 / P5-2
 * ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  // 敏感词定位滚动 ref
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
      // 自动选中第一条
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

  // 加载选中项的审核历史
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

  // 审核提交
  const handleSubmit = async (result: AuditResult) => {
    if (!currentItem) return;
    // 驳回校验：必填原因 + 说明 ≥10 字
    if (result === 'reject') {
      if (!rejectReason) {
        message.error('请选择驳回原因');
        return;
      }
      if (comment.trim().length < 10) {
        message.error('驳回时审核意见需 ≥10 字');
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
      const actionText = result === 'approve' ? '通过' : result === 'revise' ? '待修改' : '驳回';
      message.success(`已${actionText}，通知将下发给作者`);
      // 清空表单
      setComment('');
      setRejectReason(undefined);
      // 跳转下一条
      if (res.nextId) {
        setSelectedId(res.nextId);
      }
      loadData();
    } finally {
      setSubmitting(false);
    }
  };

  // 敏感词点击定位
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
    { title: '内容管理' },
    { title: '内容审核' },
  ];

  const segments = useMemo(() => {
    if (!currentItem) return [];
    return splitContentBySensitive(currentItem.content, currentItem.sensitiveHits);
  }, [currentItem]);

  return (
    <div className="b-audit-workbench-page">
      <BPageHeader
        title="内容审核工作台"
        breadcrumb={breadcrumb}
        onBack={() => navigate('/workbench')}
        extra={
          <Space size="large">
            <Badge count={pendingCount} overflowCount={99} offset={[0, 0]}>
              <span style={{ color: 'var(--color-text-secondary)' }}>待审</span>
            </Badge>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              今日已处理：<strong style={{ fontFamily: 'var(--font-mono)' }}>{todayProcessed}</strong> 条
            </span>
          </Space>
        }
      />

      {status === 'error' ? (
        <Result status="error" title="加载失败" subTitle="审核队列加载出错，请重试。" extra={<Button type="primary" onClick={loadData}>重试</Button>} />
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-4)', minHeight: 600 }}>
          {/* 左侧：待审列表 40% */}
          <Card
            title="待审列表"
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
              <Empty description="暂无待审内容" style={{ padding: 'var(--space-8)' }} />
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
                          <span>{item.wordCount.toLocaleString()} 字</span>
                          {item.sensitiveHits.length > 0 && (
                            <span style={{ color: 'var(--color-feedback-error)' }}>
                              敏感词 {item.sensitiveHits.length} 处
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

          {/* 右侧：内容预览 + 审核操作 60% */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {status === 'loading' ? (
              <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
            ) : !currentItem ? (
              <Card>
                <Empty description="请从左侧选择待审条目" style={{ padding: 'var(--space-8)' }} />
              </Card>
            ) : (
              <>
                {/* 内容预览 + 敏感词高亮 */}
                <Card
                  title={
                    <Space>
                      <span>{currentItem.chapterTitle}</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-caption, 13px)', fontWeight: 'normal' }}>
                        《{currentItem.novelTitle}》 · {currentItem.author} · {currentItem.wordCount.toLocaleString()} 字
                      </span>
                    </Space>
                  }
                  extra={<Tag color={AUDIT_LEVEL_LABEL[currentItem.level].color}>{AUDIT_LEVEL_LABEL[currentItem.level].text}</Tag>}
                >
                  {/* 敏感词清单 */}
                  {currentItem.sensitiveHits.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-feedback-error-bg)', borderRadius: 'var(--radius-md, 8px)' }}>
                      <div style={{ marginBottom: 'var(--space-2)', color: 'var(--color-feedback-error)', fontWeight: 600 }}>
                        命中敏感词 {currentItem.sensitiveHits.length} 处：
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

                  {/* 正文 + 敏感词高亮 */}
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

                {/* 审核历史 */}
                {history.length > 0 && (
                  <Card title="审核历史">
                    <Timeline
                      items={history.map((h) => ({
                        color: h.result === 'approve' ? 'green' : h.result === 'reject' ? 'red' : 'blue',
                        children: (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <Tag color={h.result === 'approve' ? 'success' : h.result === 'reject' ? 'error' : 'processing'}>
                                {h.result === 'approve' ? '通过' : h.result === 'reject' ? '驳回' : '待修改'}
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

                {/* 审核操作栏（底部固定） */}
                <Card title="审核操作">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <label style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>驳回原因：</label>
                      <Select
                        value={rejectReason}
                        onChange={setRejectReason}
                        options={REJECT_REASON_OPTIONS}
                        placeholder="选择驳回原因（驳回时必填）"
                        style={{ width: 200 }}
                        allowClear
                      />
                    </div>
                    <TextArea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="审核意见（驳回时需 ≥10 字）"
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
                        通过
                      </Button>
                      <Button
                        loading={submitting}
                        onClick={() => handleSubmit('revise')}
                        disabled={!canApprove}
                      >
                        待修改
                      </Button>
                      <Button
                        danger
                        loading={submitting}
                        onClick={() => handleSubmit('reject')}
                        disabled={!canReject || !rejectReason || comment.trim().length < 10}
                      >
                        驳回
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
