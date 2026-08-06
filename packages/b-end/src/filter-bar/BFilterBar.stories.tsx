import type { Meta, StoryObj } from "@storybook/react";
import { BFilterBar } from "./BFilterBar";

const meta: Meta<typeof BFilterBar> = {
  title: "BEnd/FilterBar/BFilterBar",
  component: BFilterBar,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof BFilterBar>;

export const Default: Story = {
  args: {
    fields: [
      {
        key: "status",
        label: "状态",
        type: "select",
        options: [
          { label: "全部", value: "all" },
          { label: "已发布", value: "published" },
        ],
      },
      {
        key: "category",
        label: "分类",
        type: "select",
        options: [
          { label: "全部", value: "all" },
          { label: "玄幻", value: "xuanhuan" },
        ],
      },
    ],
    onSearch: () => {},
  },
};
