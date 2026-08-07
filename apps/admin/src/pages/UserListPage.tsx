import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  Space,
  Table,
  Tag,
  Input,
  App,
  Modal,
  Checkbox,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/stores/authStore";
import { http } from "@/api/http";
import { BPageHeader } from "@novel/b-end";
import "./UserListPage.css";

const { confirm } = Modal;

interface UserItem {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  level: number;
  isVip: boolean;
  status: number;
  createdAt: number;
}

interface PagedResult {
  items: UserItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function UserListPage() {
  const { t } = useTranslation();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchKey, setSearchKey] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);

  const loadData = useCallback(
    async (targetPage?: number) => {
      setLoading(true);
      try {
        const p = targetPage ?? page;
        const res = await http.get<PagedResult>("/users", {
          page: p,
          page_size: pageSize,
          search_key: searchKey,
          role: roleFilter.length > 0 ? roleFilter.join(",") : undefined,
        });
        setData(res.items ?? []);
        setTotal(res.total ?? 0);
      } catch {
        message.error(t("user:message.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, searchKey, roleFilter, message, t],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBan = useCallback((record: UserItem) => {
    confirm({
      title: t("user:confirm.title"),
      icon: <ExclamationCircleOutlined />,
      content:
        record.status === 1
          ? t("user:confirm.ban", { username: record.username })
          : t("user:confirm.unban", { username: record.username }),
      onOk: async () => {
        try {
          await http.post(`/users/${record.id}/status`, {
            status: record.status === 1 ? 0 : 1,
          });
          message.success(t("user:message.success"));
          loadData();
        } catch {
          message.error(t("user:message.failed"));
        }
      },
    });
  }, [t, message, loadData]);

  const columns: TableColumnsType<UserItem> = useMemo(() => [
    { title: t("user:table.id"), dataIndex: "id", width: 60, ellipsis: true },
    { title: t("user:table.username"), dataIndex: "username", width: 120 },
    { title: t("user:table.nickname"), dataIndex: "nickname", width: 120 },
    {
      title: t("user:table.level"),
      dataIndex: "level",
      width: 60,
      render: (v: number) => `Lv.${v}`,
    },
    {
      title: t("user:table.vip"),
      dataIndex: "isVip",
      width: 60,
      render: (v: boolean) =>
        v ? <Tag color="gold">VIP</Tag> : <Tag>{t("user:vipLabel")}</Tag>,
    },
    {
      title: t("user:table.status"),
      dataIndex: "status",
      width: 70,
      render: (v: number) => (
        <Tag color={v === 1 ? "success" : "error"}>
          {v === 1
            ? t("user:statusLabel.normal")
            : t("user:statusLabel.banned")}
        </Tag>
      ),
    },
    {
      title: t("user:table.registerTime"),
      dataIndex: "createdAt",
      width: 160,
      render: (v: number) => (v ? new Date(v).toLocaleString("zh-CN") : "-"),
    },
    {
      title: t("user:table.operation"),
      width: 100,
      fixed: "right",
      render: (_: unknown, record: UserItem) => (
        <Space>
          {hasPermission("user.edit") && (
            <Button
              type="link"
              size="small"
              danger={record.status === 1}
              onClick={() => handleBan(record)}
            >
              {record.status === 1
                ? t("user:action.ban")
                : t("user:action.unban")}
            </Button>
          )}
        </Space>
      ),
    },
], [t, hasPermission, handleBan]);

  return (
    <div className="user-list-page">
      <BPageHeader title={t("user:title")} />
      <Card>
        <Space
          style={{
            marginBottom: "var(--space-4)",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <Input
              placeholder={t("user:searchPlaceholder")}
              prefix={<SearchOutlined />}
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              onPressEnter={() => {
                setPage(1);
                loadData(1);
              }}
              style={{ width: 240 }}
              allowClear
            />
            <Checkbox.Group
              value={roleFilter}
              onChange={(v) => {
                setRoleFilter(v as string[]);
                setPage(1);
              }}
              className="filter-checkbox-group"
            >
              <Checkbox value="reader">{t("user:filterReader")}</Checkbox>
              <Checkbox value="author">{t("user:filterAuthor")}</Checkbox>
            </Checkbox.Group>
            <Button icon={<ReloadOutlined />} onClick={() => loadData()}>
              {t("common:refresh")}
            </Button>
          </Space>
        </Space>
        <Table<UserItem>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
              loadData(p);
            },
            showSizeChanger: true,
            showTotal: (totalCount) => t("common:total", { count: totalCount }),
          }}
        />
      </Card>
    </div>
  );
}
