import type { Meta, StoryObj } from '@storybook/react';
import { BPageHeader } from './BPageHeader';

const meta: Meta<typeof BPageHeader> = {
  title: 'BEnd/PageHeader/BPageHeader',
  component: BPageHeader,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof BPageHeader>;

export const Default: Story = {
  args: {
    title: '作品详情',
    breadcrumb: [{ title: '内容管理' }, { title: '作品管理' }, { title: '斗破苍穹' }],
    onBack: () => {},
  },
};

export const WithExtra: Story = {
  args: {
    title: '新建作品',
    breadcrumb: [{ title: '内容管理' }, { title: '作品管理' }, { title: '新建' }],
    extra: <button>保存</button>,
    onBack: () => {},
  },
};