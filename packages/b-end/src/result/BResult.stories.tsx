import type { Meta, StoryObj } from '@storybook/react';
import { BResult } from './BResult';

const meta: Meta<typeof BResult> = {
  title: 'BEnd/Result/BResult',
  component: BResult,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof BResult>;

export const Success: Story = {
  args: {
    status: 'success',
    title: '操作成功',
    subTitle: '作品已成功提交审核',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    title: '操作失败',
    subTitle: '网络异常，请稍后重试',
  },
};