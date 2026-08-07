import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
} from "antd";
import type { AuditLevel, AuditResult, RejectReason } from "@novel/types";
import { BPageHeader } from "@novel/b-end";
import type { BPageHeaderProps } from "@novel/b-end";
import { useAuthStore } from "@/stores/authStore";
import {
  fetchAuditQueue,
  fetchAuditHistory,
  fetchAuditContent,
  submitAudit,
  splitContentBySensitive,
  AUDIT_LEVEL_OPTIONS,
  AUDIT_LEVEL_LABEL,
  SENSITIVE_LEVEL_CONFIG,
  REJECT_REASON_OPTIONS,
} from "@/api/audit-api";
import type {
  AuditItem,
  AuditHistoryEntry,
  SensitiveHit,
} from "@/api/audit-api";
import "./AuditWorkbenchPage.css";

const { TextArea } = Input;

type PageStatus = "loading" | "ready" | "empty" | "error";

export default function AuditWorkbenchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<PageStatus>("loading");
  const [queue, setQueue] = useState<AuditItem[]>([]);
  const [filterLevel, setFilterLevel] = useState<AuditLevel | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<AuditHistoryEntry[]>([]);
  const [content, setContent] = useState("");
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState<RejectReason | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayProcessed, setTodayProcessed] = useState(0);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [fadingOutId, setFadingOutId] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const hitRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  const canApprove = hasPermission("audit.approve");
  const canReject = hasPermission("audit.reject");

  const loadData = useCallback(async () => {
    setStatus("loading");
    try {
      const { list, stats } = await fetchAuditQueue(filterLevel);
      setQueue(list);
      setPendingCount(stats.pendingCount);
      setTodayProcessed(stats.todayProcessed);
      if (list.length > 0 && !list.find((i) => i.id === selectedId)) {
        setSelectedId(list[0]!.id);
      } else if (list.length === 0) {
        setSelectedId(null);
      }
      setStatus(list.length === 0 ? "empty" : "ready");
    } catch {
      setStatus("error");
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
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setContent("");
      return;
    }
    let cancelled = false;
    (async () => {
      const c = await fetchAuditContent(selectedId);
      if (!cancelled) setContent(c);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const currentItem = useMemo(
    () => queue.find((i) => i.id === selectedId) ?? null,
    [queue, selectedId],
  );

  const handleSubmit = async (result: AuditResult) => {
    if (!currentItem) return;
    if (result === "reject") {
      if (!rejectReason) {
        message.error(t("audit:message.noRejectReason"));
        return;
      }
      if (comment.trim().length < 10) {
        message.error(t("audit:message.commentTooShort"));
        return;
      }
    }
    setSubmitting(true);
    setFadingOutId(currentItem.id);
    const actionText =
      result === "approve"
        ? t("audit:resultLabel.approved")
        : result === "revise"
          ? t("audit:resultLabel.revise")
          : t("audit:resultLabel.rejected");
    message.success(t("audit:message.completed", { action: actionText }));
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = await submitAudit({
        ids: [currentItem.id],
        result,
        comment: comment.trim(),
        rejectReason: result === "reject" ? rejectReason : undefined,
      });
      setComment("");
      setRejectReason(undefined);
      if (res.nextId) {
        setSelectedId(res.nextId);
      }
      loadData();
    } finally {
      setSubmitting(false);
      setFadingOutId(null);
    }
  };

  const handleSensitiveClick = (hit: SensitiveHit) => {
    const el = hitRefs.current.get(hit.text + hit.offset);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = `2px solid ${SENSITIVE_LEVEL_CONFIG[hit.level].color}`;
      setTimeout(() => {
        el.style.outline = "none";
      }, 2000);
    }
  };

  const renderQueueItem = useCallback((item: AuditItem) => {
    const levelCfg = AUDIT_LEVEL_LABEL[item.level];
    const isSelected = item.id === selectedId;
    return (
      <List.Item
        onClick={() => setSelectedId(item.id)}
        className={`awb-item${isSelected ? " awb-item--selected" : ""}${fadingOutId === item.id ? " awb-item--fade-out" : ""}`}
      >
        <div className="awb-item__inner">
          <div className="awb-item__header">
            <strong className="awb-item__title">{item.chapterTitle}</strong>
            <Tag color={levelCfg.color}>{levelCfg.text}</Tag>
          </div>
          <div className="awb-item__meta">
            《{item.novelTitle}》 · {item.author}
          </div>
          <div className="awb-item__footer">
            <span>{item.wordCount.toLocaleString()} {t("audit:wordSuffix")}</span>
            {item.sensitiveHits.length > 0 && (
              <span className="awb-item__sensitive-hint">
                {t("audit:sensitiveHit", { count: item.sensitiveHits.length })}
              </span>
            )}
          </div>
        </div>
      </List.Item>
    );
  }, [selectedId, fadingOutId, setSelectedId, t]);

  const breadcrumb: BPageHeaderProps["breadcrumb"] = [
    { title: t("audit:breadcrumb") },
    { title: t("audit:title") },
  ];

  const segments = useMemo(() => {
    if (!currentItem) return [];
    return splitContentBySensitive(content, currentItem.sensitiveHits);
  }, [currentItem, content]);

  return (
    <div className="b-audit-workbench-page">
      <BPageHeader
        title={t("audit:workbenchTitle")}
        breadcrumb={breadcrumb}
        onBack={() => navigate("/workbench")}
        extra={
          <Space size="large">
            <Badge count={pendingCount} overflowCount={99} offset={[0, 0]}>
              <span className="awb-text-secondary">
                {t("audit:stats.pending")}
              </span>
            </Badge>
            <span className="awb-text-secondary">
              {t("audit:stats.todayProcessed")}
              <strong className="awb-text-mono">{todayProcessed}</strong>{" "}
              {t("audit:stats.unit")}
            </span>
          </Space>
        }
      />

      {status === "error" ? (
        <Result
          status="error"
          title={t("common:loadError")}
          subTitle={t("common:retryDesc")}
          extra={
            <Button type="primary" onClick={loadData}>
              {t("common:retry")}
            </Button>
          }
        />
      ) : (
        <div className="awb-layout">
          <Card
            title={t("audit:leftPanel")}
            extra={
              <Select
                value={filterLevel}
                onChange={(v) => {
                  setFilterLevel(v);
                }}
                options={AUDIT_LEVEL_OPTIONS}
                className="awb-sidebar-filter"
              />
            }
            className="awb-sidebar"
            styles={{ body: { padding: 0 } }}
          >
            {status === "loading" ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : queue.length === 0 ? (
              <Empty description={t("audit:empty")} className="awb-empty" />
            ) : (
              <List
                dataSource={queue}
                split
                renderItem={renderQueueItem}
              />
            )}
          </Card>

          <div className="awb-content-area">
            {status === "loading" ? (
              <Card>
                <Skeleton active paragraph={{ rows: 8 }} />
              </Card>
            ) : !currentItem ? (
              <Card>
                <Empty
                  description={t("audit:emptySelect")}
                  className="awb-empty"
                />
              </Card>
            ) : (
              <>
                <Card
                  title={
                    <Space>
                      <span>{currentItem.chapterTitle}</span>
                      <span className="awb-subtitle">
                        《{currentItem.novelTitle}》 · {currentItem.author} ·{" "}
                        {currentItem.wordCount.toLocaleString()}{" "}
                        {t("audit:wordSuffix")}
                      </span>
                    </Space>
                  }
                  extra={
                    <Tag color={AUDIT_LEVEL_LABEL[currentItem.level].color}>
                      {AUDIT_LEVEL_LABEL[currentItem.level].text}
                    </Tag>
                  }
                >
                  {currentItem.sensitiveHits.length > 0 && (
                    <div className="awb-sensitive-box">
                      <div className="awb-sensitive-box__title">
                        {t("audit:sensitiveTitle", {
                          count: currentItem.sensitiveHits.length,
                        })}
                      </div>
                      <Space wrap>
                        {currentItem.sensitiveHits.map((hit, idx) => {
                          const cfg = SENSITIVE_LEVEL_CONFIG[hit.level];
                          return (
                            <Tooltip
                              key={idx}
                              title={`${cfg.label}：${hit.suggestion}`}
                            >
                              <Tag
                                className="awb-sensitive-tag"
                                style={{
                                  color: cfg.color,
                                  background: cfg.bg,
                                  borderColor: cfg.color,
                                }}
                                onClick={() => handleSensitiveClick(hit)}
                                role="button"
                                tabIndex={0}
                                aria-label={`${t("audit:sensitiveTitle", { count: 1 })}: ${hit.text}`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ")
                                    handleSensitiveClick(hit);
                                }}
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
                    className={`awb-content-viewer${contentExpanded ? " awb-content-viewer--expanded" : ""}`}
                  >
                    {segments.map((seg, idx) =>
                      seg.isHit && seg.hit ? (
                        <Tooltip
                          key={idx}
                          title={`${SENSITIVE_LEVEL_CONFIG[seg.hit.level].label}：${seg.hit.suggestion}`}
                        >
                          <span
                            ref={(el) => {
                              if (el)
                                hitRefs.current.set(
                                  seg.hit!.text + seg.hit!.offset,
                                  el,
                                );
                            }}
                            className="awb-sensitive-highlight"
                            style={{
                              background:
                                SENSITIVE_LEVEL_CONFIG[seg.hit.level].bg,
                              color:
                                SENSITIVE_LEVEL_CONFIG[seg.hit.level].color,
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
                  {!contentExpanded && (
                    <button
                      className="awb-expand-btn"
                      onClick={() => setContentExpanded(true)}
                    >
                      {t("audit:expandContent")}
                    </button>
                  )}
                  {contentExpanded && (
                    <button
                      className="awb-expand-btn"
                      onClick={() => setContentExpanded(false)}
                    >
                      {t("audit:collapseContent")}
                    </button>
                  )}
                </Card>

                {history.length > 0 && (
                  <Card title={t("audit:history")}>
                    <Timeline
                      items={history.map((h) => ({
                        color:
                          h.result === "approve"
                            ? "green"
                            : h.result === "reject"
                              ? "red"
                              : "blue",
                        children: (
                          <div>
                            <div className="awb-history-row">
                              <Tag
                                color={
                                  h.result === "approve"
                                    ? "success"
                                    : h.result === "reject"
                                      ? "error"
                                      : "processing"
                                }
                              >
                                {h.result === "approve"
                                  ? t("audit:resultLabel.approved")
                                  : h.result === "reject"
                                    ? t("audit:resultLabel.rejected")
                                    : t("audit:resultLabel.revise")}
                              </Tag>
                              <span className="awb-history-meta">
                                {h.operator} · {h.time}
                              </span>
                            </div>
                            {h.comment && (
                              <p className="awb-history-comment">{h.comment}</p>
                            )}
                          </div>
                        ),
                      }))}
                    />
                  </Card>
                )}

                <Card title={t("audit:operation.title")}>
                  <div className="awb-operation-panel">
                    <div className="awb-operation-row">
                      <label className="awb-operation-label">
                        {t("audit:operation.rejectReasonLabel")}
                      </label>
                      <Select
                        value={rejectReason}
                        onChange={setRejectReason}
                        options={REJECT_REASON_OPTIONS}
                        placeholder={t(
                          "audit:operation.rejectReasonPlaceholder",
                        )}
                        className="awb-reject-reason"
                        allowClear
                      />
                    </div>
                    <TextArea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t("audit:operation.commentPlaceholder")}
                      rows={3}
                      maxLength={500}
                      showCount
                    />
                    <Space>
                      <Button
                        type="primary"
                        loading={submitting}
                        onClick={() => handleSubmit("approve")}
                        disabled={!canApprove}
                      >
                        {t("audit:operation.approve")}
                      </Button>
                      <Button
                        loading={submitting}
                        onClick={() => handleSubmit("revise")}
                        disabled={!canApprove}
                      >
                        {t("audit:operation.revise")}
                      </Button>
                      <Button
                        danger
                        loading={submitting}
                        onClick={() => handleSubmit("reject")}
                        disabled={
                          !canReject ||
                          !rejectReason ||
                          comment.trim().length < 10
                        }
                      >
                        {t("audit:operation.reject")}
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
