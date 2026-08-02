import type { Meta, StoryObj } from '@storybook/react';
import { BUpload } from './BUpload';

const meta: Meta<typeof BUpload> = {
  title: 'BEnd/Upload/BUpload',
  component: BUpload,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof BUpload>;

export const Default: Story = {
  args: {
    accept: 'image/*',
    maxCount: 1,
    onChange: () => {},
  },
};

export const Multiple: Story = {
  args: {
    accept: 'image/*',
    maxCount: 5,
    onChange: () => {},
  },
};