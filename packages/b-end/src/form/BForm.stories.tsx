import type { Meta, StoryObj } from "@storybook/react";
import { BForm } from "./BForm";

const meta: Meta<typeof BForm> = {
  title: "BEnd/Form/BForm",
  component: BForm,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof BForm>;

export const Default: Story = {
  args: {
    fields: [
      {
        name: "title",
        label: "书名",
        rules: [{ required: true, message: "请输入书名" }],
      },
      {
        name: "author",
        label: "作者",
        rules: [{ required: true, message: "请输入作者" }],
      },
      { name: "intro", label: "简介", type: "textarea" },
    ],
    onSubmit: async () => {},
  },
};

export const WithInitialValues: Story = {
  args: {
    fields: [
      { name: "title", label: "书名" },
      { name: "author", label: "作者" },
    ],
    initialValues: { title: "斗破苍穹", author: "天蚕土豆" },
    onSubmit: async () => {},
  },
};
