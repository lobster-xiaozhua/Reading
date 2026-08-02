import type { Meta, StoryObj } from '@storybook/react';
import { BSteps } from './BSteps';

const meta: Meta<typeof BSteps> = {
  title: 'BEnd/Steps/BSteps',
  component: BSteps,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof BSteps>;

export const Default: Story = {
  args: {
    current: 1,
    items: [
      { title: '草稿', description: '创建作品' },
      { title: '待审核', description: '提交审核中' },
      { title: '已发布', description: 'C 端可阅读' },
    ],
  },
};

export const Error: Story = {
  args: {
    current: 2,
    status: 'error',
    items: [
      { title: '草稿', description: '创建作品' },
      { title: '待审核', description: '提交审核中' },
      { title: '已发布', description: 'C 端可阅读' },
      { title: '已下架', description: '已下架' },
    ],
  },
};