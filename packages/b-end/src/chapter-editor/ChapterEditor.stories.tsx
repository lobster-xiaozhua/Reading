import type { Meta, StoryObj } from "@storybook/react";
import { ChapterEditor } from "./ChapterEditor";

const meta: Meta<typeof ChapterEditor> = {
  title: "BEnd/ChapterEditor",
  component: ChapterEditor,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ChapterEditor>;

export const Empty: Story = {
  args: {
    content: "",
    onChange: () => {},
  },
};

export const WithContent: Story = {
  args: {
    content:
      "第一章 开局\n\n天地初开，万物混沌。\n\n一道金光划破天际，照亮了整片大陆。",
    onChange: () => {},
  },
};
