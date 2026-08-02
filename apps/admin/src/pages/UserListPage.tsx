import { useCallback, useEffect, useState } from 'react';
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
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKey, roleFilter, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBan = (record: UserItem) => {
    confirm({
      title: '确认操作',
      icon: <ExclamationCircleOutlined />,
      content: record.status === 1 ? `确定要封禁用户「${record.username}」吗？` : `确定要解封用户「${record.username}」吗？`,
      onOk: async () => {
        try {
          await http.post(`/users/${record.id}/status`, { status: record.status === 1 ? 0 : 1 });
          message.success('操作成功');
          loadData();
        } catch {
          message.error('操作失败');
        }
      },
    });
  };

  const columns: TableColumnsType<UserItem> = [
    { title: 'ID', dataIndex: 'id', width: 60, ellipsis: true },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '昵称', dataIndex: 'nickname', width: 120 },
    {
      title: '等级', dataIndex: 'level', width: 60,
      render: (v: number) => `Lv.${v}`,
    },
    {
      title: 'VIP', dataIndex: 'isVip', width: 60,
      render: (v: boolean) => v ? <Tag color="gold">VIP</Tag> : <Tag>否</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 70,
      render: (v: number) => (
        <Tag color={v === 1 ? 'success' : 'error'}>{v === 1 ? '正常' : '封禁'}</Tag>
      ),
    },
    {
      title: '注册时间', dataIndex: 'createdAt', width: 160,
      render: (v: number) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', width: 100, fixed: 'right',
      render: (_: unknown, record: UserItem) => (
        <Space>
          {hasPermission('user.edit') && (
            <Button type="link" size="small" danger={record.status === 1} onClick={() => handleBan(record)}>
              {record.status === 1 ? '封禁' : '解封'}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 'var(--space-4)' }}>用户管理</Title>
      <Card>
        <Space style={{ marginBottom: 'var(--space-4)', width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="搜索用户名/昵称"
              prefix={<SearchOutlined />}
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              onPressEnter={() => { setPage(1); loadData(1); }}
              style={{ width: 240 }}
              allowClear
            />
            <Select value={roleFilter} onChange={setRoleFilter} style={{ width: 120 }}>
              <Select.Option value="all">全部用户</Select.Option>
              <Select.Option value="reader">读者</Select.Option>
              <Select.Option value="author">作者</Select.Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={() => loadData()}>刷新</Button>
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
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>
    </div>
  );
}
