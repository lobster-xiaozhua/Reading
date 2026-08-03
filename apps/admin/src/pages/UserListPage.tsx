import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Space, Table, Tag, Typography, Input, App, Modal, Select } from 'antd';
import type { TableColumnsType } from 'antd';
import { SearchOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { http } from '@/api/http';

const { Title } = Typography;
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
  const [searchKey, setSearchKey] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const loadData = useCallback(async (targetPage?: number) => {
    setLoading(true);
    try {
      const p = targetPage ?? page;
      const res = await http.get<PagedResult>('/users', {
        page: p, page_size: pageSize, search_key: searchKey, role: roleFilter === 'all' ? undefined : roleFilter,
      });
      setData(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch {
      message.error(t('user:message.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKey, roleFilter, message, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBan = (record: UserItem) => {
    confirm({
      title: t('user:confirm.title'),
      icon: <ExclamationCircleOutlined />,
      content: record.status === 1 ? t('user:confirm.ban', { username: record.username }) : t('user:confirm.unban', { username: record.username }),
      onOk: async () => {
        try {
          await http.post(`/users/${record.id}/status`, { status: record.status === 1 ? 0 : 1 });
          message.success(t('user:message.success'));
          loadData();
        } catch {
          message.error(t('user:message.failed'));
        }
      },
    });
  };

  const columns: TableColumnsType<UserItem> = [
    { title: t('user:table.id'), dataIndex: 'id', width: 60, ellipsis: true },
    { title: t('user:table.username'), dataIndex: 'username', width: 120 },
    { title: t('user:table.nickname'), dataIndex: 'nickname', width: 120 },
    {
      title: t('user:table.level'), dataIndex: 'level', width: 60,
      render: (v: number) => `Lv.${v}`,
    },
    {
      title: t('user:table.vip'), dataIndex: 'isVip', width: 60,
      render: (v: boolean) => v ? <Tag color="gold">VIP</Tag> : <Tag>{t('user:vipLabel')}</Tag>,
    },
    {
      title: t('user:table.status'), dataIndex: 'status', width: 70,
      render: (v: number) => (
        <Tag color={v === 1 ? 'success' : 'error'}>{v === 1 ? t('user:statusLabel.normal') : t('user:statusLabel.banned')}</Tag>
      ),
    },
    {
      title: t('user:table.registerTime'), dataIndex: 'createdAt', width: 160,
      render: (v: number) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: t('user:table.operation'), width: 100, fixed: 'right',
      render: (_: unknown, record: UserItem) => (
        <Space>
          {hasPermission('user.edit') && (
            <Button type="link" size="small" danger={record.status === 1} onClick={() => handleBan(record)}>
              {record.status === 1 ? t('user:action.ban') : t('user:action.unban')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 'var(--space-4)' }}>{t('user:title')}</Title>
      <Card>
        <Space style={{ marginBottom: 'var(--space-4)', width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder={t('user:searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              onPressEnter={() => { setPage(1); loadData(1); }}
              style={{ width: 240 }}
              allowClear
            />
            <Select value={roleFilter} onChange={setRoleFilter} style={{ width: 120 }}>
              <Select.Option value="all">{t('user:filterAll')}</Select.Option>
              <Select.Option value="reader">{t('user:filterReader')}</Select.Option>
              <Select.Option value="author">{t('user:filterAuthor')}</Select.Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={() => loadData()}>{t('common:refresh')}</Button>
          </Space>
        </Space>
        <Table<UserItem>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            current: page, pageSize, total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); loadData(p); },
            showSizeChanger: true,
            showTotal: (totalCount) => t('common:total', { count: totalCount }),
          }}
        />
      </Card>
    </div>
  );
}