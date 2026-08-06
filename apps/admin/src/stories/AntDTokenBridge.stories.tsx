/* ============================================================
 * P0-14 · 示例 Story 验证 AntD + 令牌桥接
 * 渲染 Button / Tag / Modal 三类典型组件
 * ============================================================ */

import type { Meta, StoryObj } from "@storybook/react";
import { Button, Tag, Space, Card, Typography, Modal, App } from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useState } from "react";

const { Title, Text } = Typography;

const meta: Meta = {
  title: "P0/AntD-Token-Bridge",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "验证 AntD 5.x 与 Atlas Design Tokens 桥接：切换 light/dark 主题，组件应跟随切换。详见 [token-map.md](../../apps/admin/src/theme/token-map.md)。",
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const BrandColor: Story = {
  render: () => (
    <Card title="品牌色桥接（colorPrimary → var(--color-brand)）">
      <Space direction="vertical" size="middle">
        <Space>
          <Button type="primary">Primary</Button>
          <Button type="primary" danger>
            Danger
          </Button>
          <Button>Default</Button>
          <Button type="dashed">Dashed</Button>
          <Button type="link">Link</Button>
        </Space>
        <Text type="secondary">
          切换 light/dark 主题，按钮色值应跟随 var(--color-brand) 切换
        </Text>
      </Space>
    </Card>
  ),
};

export const FunctionalColors: Story = {
  render: () => (
    <Card title="功能色桥接（success/warning/error/info → var(--color-feedback-*)）">
      <Space size="middle" wrap>
        <Tag color="success">
          <CheckCircleOutlined /> 已上架
        </Tag>
        <Tag color="warning">
          <ExclamationCircleOutlined /> 待审核
        </Tag>
        <Tag color="error">已下架</Tag>
        <Tag color="processing">草稿</Tag>
        <Tag color="default">默认</Tag>
      </Space>
    </Card>
  ),
};

export const ModalWithShadow: Story = {
  render: function ModalWithShadowRender() {
    const [open, setOpen] = useState(false);
    return (
      <Card title="弹窗阴影桥接（boxShadow → var(--sh-3)）">
        <Button type="primary" onClick={() => setOpen(true)}>
          打开 Modal
        </Button>
        <App>
          <Modal
            open={open}
            title="桥接验证"
            onOk={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          >
            <p>Modal 阴影应使用 var(--sh-3)（04 §12.1）</p>
            <p>圆角应使用 var(--radius-md) = 8px</p>
          </Modal>
        </App>
      </Card>
    );
  },
};

export const TypographyScale: Story = {
  render: () => (
    <Card title="字号桥接（fontSize → 14px 基准，Heading1~5 对齐 04 §4.2）">
      <Space direction="vertical">
        <Title level={1}>H1 · 38px</Title>
        <Title level={2}>H2 · 30px</Title>
        <Title level={3}>H3 · 24px</Title>
        <Title level={4}>H4 · 20px</Title>
        <Title level={5}>H5 · 16px</Title>
        <Text>Body · 14px（B 端基准）</Text>
        <Text type="secondary">Secondary · var(--color-text-secondary)</Text>
        <Text type="success">Success · var(--color-feedback-success)</Text>
      </Space>
    </Card>
  ),
};
