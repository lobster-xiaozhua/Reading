/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Tag, Dropdown, Button, Space, App, Tooltip } from "antd";
import type { TableColumnsType } from "antd";
import {
  EditOutlined,
  MoreOutlined,
  EyeOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { BNovelDetail, BNovelStatus, OfflineReason } from "@novel/types";
import { ListPageTemplate } from "@/templates/ListPageTemplate";
import type { ListPageStatus } from "@/templates/ListPageTemplate";
import type { FilterField } from "@novel/b-end";
import type { BatchAction } from "@novel/b-end";
import {
  fetchNovelList,
  batchOperate,
  submitForAudit,
  approveNovel,
  shelveNovel,
  reshelveNovel,
  NOVEL_CATEGORIES,
  NOVEL_STATUS_OPTIONS,
  CATEGORY_LABEL,
} from "@/api/novel-api";
import { ShelveModal } from "@/components/ShelveModal";
import { useAuthStore } from "@/stores/authStore";

const STATUS_TAG_MAP: Record<BNovelStatus, { color: string; text: string }> = {
  draft: { color: "gold", text: "草稿" },
  pending: { color: "processing", text: "待审核" },
  published: { color: "success", text: "已发布" },
  offline: { color: "error", text: "已下架" },
};

export default function NovelListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [status, setStatus] = useState<ListPageStatus>("loading");
  const [searchKey, setSearchKey] = useState("");
  const [filterStatus, setFilterStatus] = useState<BNovelStatus | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [advancedValues, setAdvancedValues] = useState<Record<string, unknown>>(
    {},
  );
  const [dataSource, setDataSource] = useState<BNovelDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [shelveModalOpen, setShelveModalOpen] = useState(false);
  const [shelveTargetIds, setShelveTargetIds] = useState<string[]>([]);
  const { message } = App.useApp();

  const canCreate = hasPermission("novel.create");

  const loadData = useCallback(async () => {
    setStatus("loading");
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
      setStatus(
        res.list.length === 0
          ? searchKey || filterStatus !== "all" || filterCategory !== "all"
            ? "no-search-result"
            : "empty"
          : "idle",
      );
    } catch {
      setStatus("error");
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
    setSearchKey("");
    setFilterStatus("all");
    setFilterCategory("all");
    setAdvancedValues({});
    setPage(1);
  };

  const handleBatch = async (action: "publish" | "offline" | "delete") => {
    const ids = selectedRowKeys.map(String);
    await batchOperate(ids, action);
    setSelectedRowKeys([]);
    loadData();
  };

  const handleBatchSubmitAudit = async () => {
    const ids = selectedRowKeys.map(String);
    const res = await submitForAudit(ids);
    if (res.success) {
      message.success(t("novel:message.submitted"));
      setSelectedRowKeys([]);
      loadData();
    } else {
      message.error(
        t("novel:message.submitFailed", {
          msg: res.failed?.map((f) => f.reason).join("；"),
        }),
      );
    }
  };

  const handleBatchApprove = async () => {
    const ids = selectedRowKeys.map(String);
    const res = await approveNovel(ids);
    if (res.success) {
      message.success(t("novel:message.approved"));
      setSelectedRowKeys([]);
      loadData();
    } else {
      message.error(
        t("novel:message.approveFailed", {
          msg: res.failed?.map((f) => f.reason).join("；"),
        }),
      );
    }
  };

  const handleBatchShelve = () => {
    setShelveTargetIds(selectedRowKeys.map(String));
    setShelveModalOpen(true);
  };

  const handleShelveConfirm = async (reason: string, note: string) => {
    const res = await shelveNovel(
      shelveTargetIds,
      reason as OfflineReason,
      note,
    );
    if (res.success) {
      message.success(t("novel:message.offlined"));
      setSelectedRowKeys([]);
      loadData();
    } else {
      message.error(
        t("novel:message.offlineFailed", {
          msg: res.failed?.map((f) => f.reason).join("；"),
        }),
      );
    }
  };

  const batchActions: BatchAction[] = [
    {
      key: "submit-audit",
      label: t("novel:list.batchSubmitAudit"),
      onClick: handleBatchSubmitAudit,
    },
    {
      key: "approve",
      label: t("novel:list.batchApprove"),
      onClick: handleBatchApprove,
    },
    {
      key: "publish",
      label: t("novel:list.batchOnline"),
      onClick: () => handleBatch("publish"),
    },
    {
      key: "offline",
      label: t("novel:list.batchOffline"),
      danger: true,
      onClick: handleBatchShelve,
    },
    {
      key: "delete",
      label: t("novel:list.batchDelete"),
      danger: true,
      confirmTitle: t("common:deleteConfirm"),
      confirmContent: t("common:deleteWarningDetail"),
      onClick: () => handleBatch("delete"),
    },
  ];

  const columns: TableColumnsType<BNovelDetail> = useMemo(() => [
    {
      title: t("novel:table.title"),
      dataIndex: "title",
      key: "title",
      width: 300,
      ellipsis: true,
      render: (title: string, record) => (
        <Tooltip title={title}>
          <a
            onClick={() => navigate(`/novel/${record.id}`)}
            style={{ color: "var(--color-brand)" }}
          >
            {title}
          </a>
        </Tooltip>
      ),
    },
    {
      title: t("novel:table.author"),
      dataIndex: "author",
      key: "author",
      width: 120,
    },
    {
      title: t("novel:table.category"),
      dataIndex: "category",
      key: "category",
      width: 100,
      render: (cat: string) => CATEGORY_LABEL[cat] ?? cat,
    },
    {
      title: t("novel:table.wordCount"),
      dataIndex: "wordCount",
      key: "wordCount",
      width: 120,
      align: "right",
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: t("novel:table.status"),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s: BNovelStatus) => {
        const cfg = STATUS_TAG_MAP[s];
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: t("novel:table.updatedAt"),
      dataIndex: "lastUpdated",
      key: "lastUpdated",
      width: 180,
      render: (v: number) => {
        if (!v) return "-";
        const d = new Date(v);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      },
    },
    {
      title: t("novel:table.operation"),
      key: "action",
      fixed: "right",
      width: 160,
      render: (_, record) => {
        const canEdit = hasPermission("novel.edit");
        const statusAction =
          record.status === "draft"
            ? {
                key: "submit-audit",
                label: t("novel:action.submitAudit"),
                icon: <AuditOutlined />,
              }
            : record.status === "pending"
              ? {
                  key: "approve",
                  label: t("novel:action.approve"),
                  icon: <CheckCircleOutlined />,
                }
              : record.status === "published"
                ? {
                    key: "offline",
                    label: t("novel:action.offline"),
                    icon: <ArrowDownOutlined />,
                    danger: true,
                  }
                : {
                    key: "reshelve",
                    label: t("novel:action.reshelve"),
                    icon: <ArrowUpOutlined />,
                  };
        const menuItems = [
          {
            key: "view",
            label: t("novel:action.viewDetail"),
            icon: <EyeOutlined />,
          },
          ...(canEdit
            ? [
                {
                  key: "edit",
                  label: t("novel:action.edit"),
                  icon: <EditOutlined />,
                },
              ]
            : []),
          statusAction,
        ];
        return (
          <Space size="small">
            {canEdit && (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/novel/${record.id}/edit`)}
              >
                {t("novel:action.edit")}
              </Button>
            )}
            <Dropdown
              menu={{
                items: menuItems,
                onClick: ({ key }) => {
                  if (key === "view") navigate(`/novel/${record.id}`);
                  else if (key === "edit") navigate(`/novel/${record.id}/edit`);
                  else if (key === "submit-audit") {
                    submitForAudit([record.id]).then((res) => {
                      if (res.success) {
                        message.success(t("novel:message.submitted"));
                        loadData();
                      } else {
                        message.error(
                          t("novel:message.submitFailed", {
                            msg: res.failed?.map((f) => f.reason).join("；"),
                          }),
                        );
                      }
                    });
                  } else if (key === "approve") {
                    approveNovel([record.id]).then((res) => {
                      if (res.success) {
                        message.success(t("novel:message.approved"));
                        loadData();
                      } else {
                        message.error(
                          t("novel:message.approveFailed", {
                            msg: res.failed?.map((f) => f.reason).join("；"),
                          }),
                        );
                      }
                    });
                  } else if (key === "offline") {
                    setShelveTargetIds([record.id]);
                    setShelveModalOpen(true);
                  } else if (key === "reshelve") {
                    reshelveNovel([record.id]).then((res) => {
                      if (res.success) {
                        message.success(t("novel:message.reshelved"));
                        loadData();
                      } else {
                        message.error(
                          t("novel:message.reshelveFailed", {
                            msg: res.failed?.map((f) => f.reason).join("；"),
                          }),
                        );
                      }
                    });
                  }
                },
              }}
            >
              <Button type="link" size="small" icon={<MoreOutlined />}>
                {t("novel:action.more")}
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ], [t, navigate, hasPermission, loadData, message]);

  const filters: FilterField[] = [
    {
      name: "status",
      label: t("novel:filter.status"),
      control: (
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as BNovelStatus | "all");
            setPage(1);
          }}
          style={{
            height: 32,
            borderRadius: "var(--radius-md, 8px)",
            border: "1px solid var(--color-border)",
            padding: "0 var(--space-2)",
          }}
        >
          {NOVEL_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      name: "category",
      label: t("novel:filter.category"),
      control: (
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          style={{
            height: 32,
            borderRadius: "var(--radius-md, 8px)",
            border: "1px solid var(--color-border)",
            padding: "0 var(--space-2)",
          }}
        >
          {NOVEL_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<BNovelDetail>
        title={t("novel:list.title")}
        breadcrumb={[
          { title: t("novel:breadcrumb.content") },
          { title: t("novel:breadcrumb.novel") },
        ]}
        permission="novel.list"
        status={status}
        onRetry={loadData}
        searchKey={searchKey}
        onSearch={handleSearch}
        searchPlaceholder={t("novel:list.searchPlaceholder")}
        filters={filters}
        advancedFilters={[]}
        advancedValues={advancedValues}
        onAdvancedConfirm={setAdvancedValues}
        onReset={handleReset}
        columns={columns as any}
        dataSource={dataSource}
        rowKey="id"
        loading={status === "loading"}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (t: number) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        onPaginationChange={(p, ps) => {
          setPage(p);
          setPageSize(ps);
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        selectedCount={selectedRowKeys.length}
        batchActions={batchActions}
        onClearSelection={() => setSelectedRowKeys([])}
        onCreate={canCreate ? () => navigate("/novel/create") : undefined}
        canCreate={canCreate}
      />
      <ShelveModal
        open={shelveModalOpen}
        title={t("novel:offline.title", { count: shelveTargetIds.length })}
        onClose={() => setShelveModalOpen(false)}
        onConfirm={handleShelveConfirm}
      />
    </>
  );
}
