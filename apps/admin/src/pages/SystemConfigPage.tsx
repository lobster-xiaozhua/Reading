import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  Descriptions,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  Input,
  Select,
  App,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import type { SensitiveWord } from "@novel/b-end";
import { http } from "@/api/http";
import {
  fetchSensitiveWordLib,
  addSensitiveWord,
  removeSensitiveWord,
} from "@/api/sensitive-api";
import type { SensitiveWordLibMeta } from "@/api/sensitive-api";
import { BPageHeader } from "@novel/b-end";

const { Text } = Typography;

const LEVEL_MAP: Record<number, { color: string; label: string }> = {
  1: { color: "red", label: "严禁" },
  2: { color: "orange", label: "警告" },
  3: { color: "blue", label: "提示" },
};

export default function SystemConfigPage() {
  const { t } = useTranslation();
  const { message: msg } = App.useApp();
  const [siteName, setSiteName] = useState("小说阅读平台");
  const [icp, setIcp] = useState("");
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<SensitiveWord[]>([]);
  const [meta, setMeta] = useState<SensitiveWordLibMeta | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newLevel, setNewLevel] = useState<1 | 2 | 3>(3);
  const [newSuggestion, setNewSuggestion] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      http
        .get<{ siteName: string; icp: string }>("/system/config")
        .catch(() => ({ siteName: "小说阅读平台", icp: "" })),
      fetchSensitiveWordLib().catch(() => ({ words: [], meta: null })),
    ])
      .then(([config, lib]) => {
        setSiteName(config.siteName);
        setIcp(config.icp);
        setWords(lib.words ?? []);
        setMeta(lib.meta as SensitiveWordLibMeta | null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async () => {
    try {
      await http.put("/system/config", { siteName, icp });
      msg.success(t("system:message.saved"));
    } catch {
      msg.error(t("system:message.saveFailed"));
    }
  };

  const handleAddWord = async () => {
    if (!newText.trim()) return;
    const result = await addSensitiveWord({
      text: newText.trim(),
      level: newLevel,
      suggestion: newSuggestion,
    });
    if (result.success) {
      msg.success(t("system:message.added"));
      setAddModalOpen(false);
      setNewText("");
      setNewSuggestion("");
      const lib = await fetchSensitiveWordLib();
      setWords(lib.words);
      setMeta(lib.meta as SensitiveWordLibMeta | null);
    } else {
      msg.error(t("system:message.addFailed"));
    }
  };

  const handleRemoveWord = (text: string, level: number) => {
    Modal.confirm({
      title: t("system:confirmDelete.title"),
      icon: <ExclamationCircleOutlined />,
      content: t("system:confirmDelete.content", { text }),
      onOk: async () => {
        const result = await removeSensitiveWord(text, level as 1 | 2 | 3);
        if (result.success) {
          msg.success(t("system:message.deleted"));
          const lib = await fetchSensitiveWordLib();
          setWords(lib.words);
          setMeta(lib.meta as SensitiveWordLibMeta | null);
        } else {
          msg.error(t("system:message.deleteFailed"));
        }
      },
    });
  };

  const columns: TableColumnsType<SensitiveWord> = [
    {
      title: t("system:table.word"),
      dataIndex: "text",
      key: "text",
      width: 200,
    },
    {
      title: t("system:table.level"),
      dataIndex: "level",
      key: "level",
      width: 80,
      render: (v: number) => {
        const m = LEVEL_MAP[v] ?? { color: "default", label: String(v) };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: t("system:table.suggestion"),
      dataIndex: "suggestion",
      key: "suggestion",
      ellipsis: true,
    },
    {
      title: t("system:table.operation"),
      width: 80,
      render: (_: unknown, record: SensitiveWord) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveWord(record.text, record.level)}
        >
          {t("common:delete")}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <BPageHeader title={t("system:title")} />
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Card
          title={t("system:siteConfig")}
          extra={
            <Button type="primary" onClick={handleSaveConfig}>
              {t("system:save")}
            </Button>
          }
        >
          <Descriptions column={1} labelStyle={{ width: 120 }}>
            <Descriptions.Item label={t("system:siteName")}>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                style={{ width: 300 }}
              />
            </Descriptions.Item>
            <Descriptions.Item label={t("system:icp")}>
              <Input
                value={icp}
                onChange={(e) => setIcp(e.target.value)}
                style={{ width: 300 }}
                placeholder={t("system:icpPlaceholder")}
              />
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title={t("system:sensitiveWord")}
          extra={
            <Space>
              {meta && (
                <Text type="secondary">
                  {t("system:version", {
                    version: meta.version,
                    count: meta.totalCount,
                  })}
                </Text>
              )}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddModalOpen(true)}
              >
                {t("system:add")}
              </Button>
            </Space>
          }
        >
          <Table<SensitiveWord>
            columns={columns}
            dataSource={words}
            rowKey="text"
            loading={loading}
            pagination={{
              pageSize: 20,
              showTotal: (totalCount) =>
                t("common:total", { count: totalCount }),
            }}
            size="small"
          />
        </Card>
      </Space>

      <Modal
        title={t("system:addModal.title")}
        open={addModalOpen}
        onOk={handleAddWord}
        onCancel={() => setAddModalOpen(false)}
        okText={t("system:addModal.add")}
        cancelText={t("system:addModal.cancel")}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Text>{t("system:addModal.word")}</Text>
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder={t("system:addModal.wordPlaceholder")}
            />
          </div>
          <div>
            <Text>{t("system:addModal.level")}</Text>
            <Select
              value={newLevel}
              onChange={setNewLevel}
              style={{ width: "100%" }}
            >
              <Select.Option value={1}>
                {t("system:level.strict")}
              </Select.Option>
              <Select.Option value={2}>
                {t("system:level.warning")}
              </Select.Option>
              <Select.Option value={3}>{t("system:level.hint")}</Select.Option>
            </Select>
          </div>
          <div>
            <Text>{t("system:addModal.suggestion")}</Text>
            <Input
              value={newSuggestion}
              onChange={(e) => setNewSuggestion(e.target.value)}
              placeholder={t("system:addModal.suggestionPlaceholder")}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
