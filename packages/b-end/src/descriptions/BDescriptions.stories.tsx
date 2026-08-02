import type { Meta, StoryObj } from '@storybook/react';
import { BDescriptions } from './BDescriptions';

const meta: Meta<typeof BDescriptions> = {
  title: 'BEnd/Descriptions/BDescriptions',
  component: BDescriptions,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof BDescriptions>;

export const Default: Story = {
  args: {
    items: [
      { key: 'title', label: '书名', children: '斗破苍穹' },
      { key: 'author', label: '作者', children: '天蚕土豆' },
      { key: 'wordCount', label: '总字数', children: '530 万' },
    ],
  },
};