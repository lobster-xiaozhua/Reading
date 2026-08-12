/* ============================================================
 * P3-3 · 卡片页模板 DetailCardTemplate
 * PageHeader + 基本信息 Card（span=8）+ 数据统计 Card（span=4）+ 章节 Card + 审核 Timeline + 评论 Card
 * 状态变体：加载中 / 未找到 404 / 已下架 Alert
 * Source: 04 §5.3
 * ============================================================ */

import { useTranslation } from "react-i18next";
import {
  Card,
  Skeleton,
  Result,
  Alert,
  Button,
  Empty,
  Timeline,
  Tag,
} from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import { BPageHeader, BDescriptions, BTimeline } from "@novel/b-end";
import type { BPageHeaderProps } from "@novel/b-end";

export type DetailCardStatus =
  | "loading"
  | "ready"
  | "not-found"
  | "offline"
  | "error";

/** 基本信息 Descriptions 条目 */
export interface DescItem {
  key: string;
  label: string;
  /** 跨列数 */
  span?: number;
  children: React.ReactNode;
}

/** 审核历史条目 */
export interface AuditHistoryItem {
  time: string;
  operator: string;
  result: "approve" | "revise" | "reject";
  comment?: string;
}

/** 评论条目 */
export interface CommentItem {
  id: string;
  user: string;
  avatar?: string;
  content: string;
  time: string;
  likes?: number;
}

export interface DetailCardTemplateProps {
  /** 页面标题 */
  title: string;
  /** 面包屑 */
  breadcrumb?: BPageHeaderProps["breadcrumb"];
  /** 状态 */
  status: DetailCardStatus;
  /** 已下架提示文案（offline 状态显示） */
  offlineMessage?: string;
  /** 返回回调 */
  onBack?: BPageHeaderProps["onBack"];
  /** 加载失败重试回调（error 状态显示） */
  onRetry?: () => void;
  /** PageHeader 操作区 */
  extra?: React.ReactNode;

  /* ---------- 工作流条（PageHeader 之后、可在基本信息 Card 之前） ---------- */
  /** 工作流状态条：状态切换主操作，从 PageHeader extra 抽出，避免被标题压住 */
  workflowBar?: React.ReactNode;

  /* ---------- 基本信息 Card（span=8） ---------- */
  basicTitle?: string;
  basicItems?: DescItem[];

  /* ---------- 数据统计 Card（span=4） ---------- */
  statsTitle?: string;
  /** 统计数据节点（自由渲染，如 Progress circle） */
  statsContent?: React.ReactNode;

  /* ---------- 章节 Card ---------- */
  chapterTitle?: string;
  /** 章节列表节点 */
  chapterContent?: React.ReactNode;

  /* ---------- 审核 Timeline ---------- */
  auditTitle?: string;
  auditHistory?: AuditHistoryItem[];

  /* ---------- 评论 Card ---------- */
  commentTitle?: string;
  comments?: CommentItem[];
}

function getAuditColor(result: AuditHistoryItem["result"]): string {
  switch (result) {
    case "approve":
      return "green";
    case "reject":
      return "red";
    case "revise":
      return "blue";
}
}

/**

 * B 端卡片详情页模板
 * - 12 列栅格：基本信息 span=8 + 数据统计 span=4
 * - 章节卡 + 审核 Timeline + 评论卡纵向排列
 */
export function DetailCardTemplate(props: DetailCardTemplateProps) {
  const { t } = useTranslation();
  const {
    title,
    breadcrumb,
    status,
    offlineMessage,
    onBack,
    onRetry,
    extra,
    workflowBar,
    basicTitle,
    basicItems = [],
    statsTitle,
    statsContent,
    chapterTitle,
    chapterContent,
    auditTitle,
    auditHistory = [],
    commentTitle,
    comments = [],
  } = props;

  const resolvedOffline = offlineMessage ?? t("detailCard:offlineDefault");
  const resolvedBasicTitle = basicTitle ?? t("detailCard:basicInfo");
  const resolvedStatsTitle = statsTitle ?? t("detailCard:stats");
  const resolvedChapterTitle = chapterTitle ?? t("detailCard:chapters");
  const resolvedAuditTitle = auditTitle ?? t("detailCard:auditHistory");
  const resolvedCommentTitle = commentTitle ?? t("detailCard:comments");

  // 404
  if (status === "not-found") {
    return (
      <div>
        <BPageHeader title={title} breadcrumb={breadcrumb} onBack={onBack} />
        <Result
          status="404"
          title={t("detailCard:notFound")}
          subTitle={t("detailCard:notFoundDesc")}
          extra={
            <Button
              type="primary"
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
            >
              {t("detailCard:backToList")}
            </Button>
          }
        />
      </div>
    );
  }

  // 加载失败（网络异常/服务错误），区分于 404
  if (status === "error") {
    return (
      <div>
        <BPageHeader title={title} breadcrumb={breadcrumb} onBack={onBack} />
        <Result
          status="error"
          title={t("detailCard:loadError")}
          subTitle={t("detailCard:loadErrorDesc")}
          extra={
            onRetry ? (
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={onRetry}
              >
                重试
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="b-detail-card">
      <BPageHeader
        title={title}
        breadcrumb={breadcrumb}
        onBack={onBack}
        extra={extra}
      />

      {/* 工作流状态条：从 PageHeader extra 抽出，避免状态切换按钮被标题压住 */}
      {workflowBar && (
        <div className="b-detail-card__workflow-bar">{workflowBar}</div>
      )}

      {/* 已下架 Alert */}
      {status === "offline" && (
        <Alert
          type="warning"
          showIcon
          message={t("detailCard:offlined")}
          description={resolvedOffline}
          style={{ marginBottom: "var(--space-4)" }}
        />
      )}

      {status === "loading" ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <>
          {/* 基本信息 + 数据统计：12 列栅格，8+4 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: "var(--space-4)",
              marginBottom: "var(--space-4)",
            }}
          >
            <div style={{ gridColumn: "span 8" }}>
              <Card title={resolvedBasicTitle}>
                {basicItems.length > 0 ? (
                  <BDescriptions
                    bordered
                    column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
                    items={basicItems.map((item) => ({
                      key: item.key,
                      label: item.label,
                      span: item.span,
                      children: item.children,
                    }))}
                  />
                ) : (
                  <Empty description={t("detailCard:emptyBasic")} />
                )}
              </Card>
            </div>
            <div style={{ gridColumn: "span 4" }}>
              <Card title={resolvedStatsTitle}>
                {statsContent ?? <Empty description="暂无统计数据" />}
              </Card>
            </div>
          </div>

          {/* 章节列表 */}
          <Card title={resolvedChapterTitle} style={{ marginBottom: "var(--space-4)" }}>
            {chapterContent ?? <Empty description={t("detailCard:emptyChapters")} />}
          </Card>

          {/* 审核历史 Timeline */}
          <Card title={resolvedAuditTitle} style={{ marginBottom: "var(--space-4)" }}>
            {auditHistory.length === 0 ? (
              <Empty description={t("detailCard:emptyAudit")} />
            ) : (
              <BTimeline
                items={auditHistory.map((h) => ({
                  color: getAuditColor(h.result),
                  children: (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                        }}
                      >
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
                        <span
                          style={{
                            color: "var(--color-text-secondary)",
                            fontSize: "var(--font-size-caption, 13px)",
                          }}
                        >
                          {h.operator} · {h.time}
                        </span>
                      </div>
                      {h.comment && (
                        <p style={{ marginTop: "var(--space-1)" }}>
                          {h.comment}
                        </p>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>

          {/* 评论 Top10 */}
          <Card title={resolvedCommentTitle}>
            {comments.length === 0 ? (
              <Empty description={t("detailCard:emptyComments")} />
            ) : (
              <Timeline
                items={comments.map((c) => ({
                  children: (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                        }}
                      >
                        <strong style={{ color: "var(--color-text-primary)" }}>
                          {c.user}
                        </strong>
                        <span
                          style={{
                            color: "var(--color-text-tertiary)",
                            fontSize: "var(--font-size-caption, 13px)",
                          }}
                        >
                          {c.time}
                        </span>
                        {c.likes !== undefined && c.likes > 0 && (
                          <Tag>{c.likes} 赞</Tag>
                        )}
                      </div>
                      <p
                        style={{
                          marginTop: "var(--space-1)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {c.content}
                      </p>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
