import type { Meta, StoryObj } from "@storybook/react";
import { BTable } from "./BTable";

const meta: Meta<typeof BTable> = {
  title: "BEnd/Table/BTable",
  component: BTable,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof BTable>;

const columns = [
  { title: "书名", dataIndex: "title", key: "title" },
  { title: "作者", dataIndex: "author", key: "author" },
  { title: "字数", dataIndex: "wordCount", key: "wordCount" },
];

const data = [
  { key: "1", title: "斗破苍穹", author: "天蚕土豆", wordCount: 5300000 },
  { key: "2", title: "凡人修仙传", author: "忘语", wordCount: 7800000 },
];

export const Default: Story = {
  args: { columns, dataSource: data, rowKey: "key" },
};
export const Loading: Story = {
  args: { columns, dataSource: [], rowKey: "key", loading: true },
};
export const Empty: Story = {
  args: { columns, dataSource: [], rowKey: "key" },
};
