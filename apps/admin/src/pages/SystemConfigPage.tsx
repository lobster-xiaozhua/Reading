import { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Modal, Space, Table, Tag, Typography, Input, Select, App } from 'antd';
import { PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import type { SensitiveWord } from '@novel/b-end';
import { http } from '@/api/http';
import { fetchSensitiveWordLib, addSensitiveWord, removeSensitiveWord } from '@/api/sensitive-api';
import type { SensitiveWordLibMeta } from '@/api/sensitive-api';

const { Title, Text } = Typography;

const LEVEL_MAP: Record<number, { color: string; label: string }> = {
  1: { color: 'red', label: '严禁' },
  2: { color: 'orange', label: '警告' },
  3: { color: 'blue', label: '提示' },
};

export default function SystemConfigPage() {
  const { message: msg } = App.useApp();
  const [siteName, setSiteName] = useState('小说阅读平台');
  const [icp, setIcp] = useState('');
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<SensitiveWord[]>([]);
  const [meta, setMeta] = useState<SensitiveWordLibMeta | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [newLevel, setNewLevel] = useState<1 | 2 | 3>(3);
  const [newSuggestion, setNewSuggestion] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      http.get<{ siteName: string; icp: string }>('/system/config').catch(() => ({ siteName: '小说阅读平台', icp: '' })),
      fetchSensitiveWordLib().catch(() => ({ words: [], meta: null })),
    ]).then(([config, lib]) => {
      setSiteName(config.siteName);
      setIcp(config.icp);
      setWords(lib.words ?? []);
      setMeta(lib.meta as SensitiveWordLibMeta | null);
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async () => {
    try {
      await http.put('/system/config', { siteName, icp });
      msg.success('配置已保存');
    } catch {
      msg.error('保存失败');
    }
  };

  const handleAddWord = async () => {
    if (!newText.trim()) return;
    const result = await addSensitiveWord({ text: newText.trim(), level: newLevel, suggestion: newSuggestion });
    if (result.success) {
      msg.success('敏感词已添加');
      setAddModalOpen(false);
      setNewText('');
      setNewSuggestion('');
      const lib = await fetchSensitiveWordLib();
      setWords(lib.words);
      setMeta(lib.meta as SensitiveWordLibMeta | null);
    } else {
      msg.error('添加失败');
    }
  };

  const handleRemoveWord = (text: string, level: number) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除敏感词「${text}」吗？`,
      onOk: async () => {
        const result = await removeSensitiveWord(text, level as 1 | 2 | 3);
        if (result.success) {
          msg.success('已删除');
          const lib = await fetchSensitiveWordLib();
          setWords(lib.words);
          setMeta(lib.meta as SensitiveWordLibMeta | null);
        } else {
          msg.error('删除失败');
        }
      },
    });
  };

  const columns: TableColumnsType<SensitiveWord> = [
    { title: '敏感词', dataIndex: 'text', key: 'text', width: 200 },
    {
      title: '级别', dataIndex: 'level', key: 'level', width: 80,
      render: (v: number) => {
        const m = LEVEL_MAP[v] ?? { color: 'default', label: String(v) };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    { title: '建议替换', dataIndex: 'suggestion', key: 'suggestion', ellipsis: true },
    {
      title: '操作', width: 80,
      render: (_: unknown, record: SensitiveWord) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemoveWord(record.text, record.level)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 'var(--space-4)' }}>系统设置</Title>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="站点配置" extra={<Button type="primary" onClick={handleSaveConfig}>保存</Button>}>
          <Descriptions column={1} labelStyle={{ width: 120 }}>
            <Descriptions.Item label="站点名称">
              <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} style={{ width: 300 }} />
            </Descriptions.Item>
            <Descriptions.Item label="ICP 备案号">
              <Input value={icp} onChange={(e) => setIcp(e.target.value)} style={{ width: 300 }} placeholder="沪ICP备xxxxxxxx号" />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title="敏感词库"
          extra={
            <Space>
              {meta && <Text type="secondary">版本: {meta.version} | 共 {meta.totalCount} 条</Text>}
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>新增</Button>
            </Space>
          }
        >
          <Table<SensitiveWord>
            columns={columns}
            dataSource={words}
            rowKey="text"
            loading={loading}
            pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
            size="small"
          />
        </Card>
      </Space>

      <Modal
        title="新增敏感词"
        open={addModalOpen}
        onOk={handleAddWord}
        onCancel={() => setAddModalOpen(false)}
        okText="添加"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>敏感词</Text>
            <Input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="输入敏感词" />
          </div>
          <div>
            <Text>级别</Text>
            <Select value={newLevel} onChange={setNewLevel} style={{ width: '100%' }}>
              <Select.Option value={1}>严禁</Select.Option>
              <Select.Option value={2}>警告</Select.Option>
              <Select.Option value={3}>提示</Select.Option>
            </Select>
          </div>
          <div>
            <Text>替换建议</Text>
            <Input value={newSuggestion} onChange={(e) => setNewSuggestion(e.target.value)} placeholder="建议替换的词语" />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
