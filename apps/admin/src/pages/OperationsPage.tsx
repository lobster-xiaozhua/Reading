import { useCallback, useEffect, useState } from "react";
import { App, Button, Card, Col, Descriptions, Empty, List, Row, Space, Statistic, Tag, Typography } from "antd";
import { ApiOutlined, DashboardOutlined, PlayCircleOutlined, ReloadOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { BPageHeader } from "@novel/b-end";
import { fetcher, type OperationTag, type OperationsSnapshot } from "@/api/fetcher";
import "./OperationsPage.css";

const { Text } = Typography;

const CHECKS: Array<{ tag: OperationTag; label: string }> = [
  { tag: "health", label: "健康检查" },
  { tag: "api", label: "API 检查" },
  { tag: "pages", label: "页面检查" },
  { tag: "flow", label: "业务流检查" },
  { tag: "performance", label: "性能检查" },
];

const statusColor: Record<string, string> = {
  ready: "success",
  degraded: "warning",
  unavailable: "error",
  pass: "success",
  fail: "error",
  warn: "warning",
  skip: "default",
  done: "success",
  failed: "error",
  running: "processing",
  pending: "processing",
};

const statusLabel: Record<string, string> = {
  ready: "就绪",
  degraded: "部分可用",
  unavailable: "不可用",
  pass: "通过",
  fail: "失败",
  warn: "警告",
  skip: "跳过",
  done: "完成",
  failed: "失败",
  running: "执行中",
  pending: "等待中",
};

function formatTime(value: string) {
  if (!value) return "暂无记录";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

export default function OperationsPage() {
  const { message } = App.useApp();
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningTag, setRunningTag] = useState<OperationTag | null>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await fetcher.workbench.getOperations());
    } catch {
      message.error("运行状态加载失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const runCheck = async (tag: OperationTag) => {
    if (runningTag) return;
    setRunningTag(tag);
    try {
      const job = await fetcher.workbench.runOperationsCheck(tag);
      while (true) {
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
        const current = await fetcher.workbench.getOperationsJob(job.jobId);
        if (current.status === "done") {
          message.success("检查已完成");
          break;
        }
        if (current.status === "failed") {
          throw new Error(current.error || "检查执行失败");
        }
      }
      await loadSnapshot();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "检查执行失败");
    } finally {
      setRunningTag(null);
    }
  };

  const summary = snapshot?.summary;
  const failedResults = snapshot?.results.filter((item) => item.status !== "pass") ?? [];

  return (
    <div className="operations-page">
      <BPageHeader
        title="运行看板"
        breadcrumb={[{ title: "系统设置" }, { title: "运行看板" }]}
        extra={
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void loadSnapshot()}>
            刷新
          </Button>
        }
      />

      <section className="operations-page__summary" aria-label="运行摘要">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            <Card size="small">
              <Statistic title="自检服务" value={statusLabel[snapshot?.serviceStatus ?? "unavailable"]} prefix={<SafetyCertificateOutlined />} />
              <Tag color={statusColor[snapshot?.serviceStatus ?? "unavailable"]}>{snapshot?.ready ? "依赖已就绪" : "等待依赖恢复"}</Tag>
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card size="small">
              <Statistic title="功能通过率" value={summary?.passRate ?? 0} suffix="%" prefix={<DashboardOutlined />} />
              <Text type="secondary">最近 {summary?.total ?? 0} 项检查</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card size="small">
              <Statistic title="失败项" value={summary?.failed ?? 0} valueStyle={{ color: (summary?.failed ?? 0) > 0 ? "var(--color-error, #cf1322)" : undefined }} prefix={<ApiOutlined />} />
              <Text type="secondary">依赖异常 {snapshot?.failedDependencies ?? 0} 项</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card size="small">
              <Statistic title="最近耗时" value={summary?.elapsedMs ?? 0} suffix="ms" prefix={<PlayCircleOutlined />} />
              <Text type="secondary">{formatTime(snapshot?.timestamp ?? "")}</Text>
            </Card>
          </Col>
        </Row>
      </section>

      <section className="operations-page__controls" aria-label="检查操作">
        <Card title="检查操作" extra={<Tag color={statusColor[snapshot?.jobStatus ?? "done"]}>{statusLabel[snapshot?.jobStatus ?? "done"]}</Tag>}>
          <Space wrap size={[8, 8]}>
            {CHECKS.map((check) => (
              <Button key={check.tag} loading={runningTag === check.tag} disabled={Boolean(runningTag)} onClick={() => void runCheck(check.tag)}>
                {check.label}
              </Button>
            ))}
            <Button type="primary" icon={<PlayCircleOutlined />} loading={runningTag === "all"} disabled={Boolean(runningTag)} onClick={() => void runCheck("all")}>
              批量完整检查
            </Button>
          </Space>
        </Card>
      </section>

      <section aria-label="最近检查详情">
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={10}>
            <Card title="最近运行" className="operations-page__fill">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="检查范围">{snapshot?.tag || "暂无记录"}</Descriptions.Item>
                <Descriptions.Item label="任务状态"><Tag color={statusColor[snapshot?.jobStatus ?? "done"]}>{statusLabel[snapshot?.jobStatus ?? "done"]}</Tag></Descriptions.Item>
                <Descriptions.Item label="通过 / 警告 / 跳过">{summary ? `${summary.passed} / ${summary.warned} / ${summary.skipped}` : "-"}</Descriptions.Item>
                <Descriptions.Item label="最近任务">{snapshot?.jobId || "-"}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} xl={14}>
            <Card title="异常与待关注项" className="operations-page__fill">
              {failedResults.length === 0 ? <Empty description="最近检查未发现异常" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
                <List
                  size="small"
                  dataSource={failedResults}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta title={<Space><Tag color={statusColor[item.status]}>{statusLabel[item.status]}</Tag><span>{item.name}</span></Space>} description={item.detail || item.tags.join(" / ")} />
                      <Text type="secondary">{item.durationMs}ms</Text>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </section>
    </div>
  );
}
