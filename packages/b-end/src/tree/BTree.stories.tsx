import type { Meta, StoryObj } from '@storybook/react';
import { BTree } from './BTree';

const meta: Meta<typeof BTree> = {
  title: 'BEnd/Tree/BTree',
  component: BTree,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BTree>;

const treeData = [
  { key: '1', title: '玄幻', children: [
    { key: '1-1', title: '东方玄幻' },
    { key: '1-2', title: '异界大陆' },
  ]},
  { key: '2', title: '仙侠', children: [
    { key: '2-1', title: '修真文明' },
    { key: '2-2', title: '神话修真' },
  ]},
  { key: '3', title: '都市' },
];

export const Default: Story = {
  args: { treeData, defaultExpandAll: true },
};

export const WithCheckable: Story = {
  args: { treeData, checkable: true, defaultExpandAll: true },
};