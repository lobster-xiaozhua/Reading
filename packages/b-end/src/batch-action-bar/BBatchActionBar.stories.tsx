import type { Meta, StoryObj } from "@storybook/react";
import { BBatchActionBar } from "./BBatchActionBar";

const meta: Meta<typeof BBatchActionBar> = {
  title: "BEnd/BatchActionBar/BBatchActionBar",
  component: BBatchActionBar,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof BBatchActionBar>;

export const Default: Story = {
  args: {
    selectedCount: 3,
    actions: [
      { key: "approve", label: "审核通过", type: "primary" },
      { key: "reject", label: "驳回", type: "danger" },
    ],
    onAction: () => {},
  },
};

export const NoSelection: Story = {
  args: {
    selectedCount: 0,
    actions: [{ key: "delete", label: "删除", type: "danger" }],
    onAction: () => {},
  },
};
