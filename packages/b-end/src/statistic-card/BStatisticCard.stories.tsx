import type { Meta, StoryObj } from '@storybook/react';
import { BStatisticCard } from './BStatisticCard';

const meta: Meta<typeof BStatisticCard> = {
  title: 'BEnd/StatisticCard',
  component: BStatisticCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BStatisticCard>;

export const Default: Story = {
  args: {
    title: '作品总数',
    value: 1280,
    suffix: '部',
    trend: 'up',
    trendText: '+12.5%',
    trendLabel: '较上月',
  },
};

export const DownTrend: Story = {
  args: {
    title: '待审核',
    value: 23,
    suffix: '条',
    trend: 'down',
    trendText: '-5',
    trendLabel: '较昨日',
  },
};

export const NoTrend: Story = {
  args: {
    title: '作者总数',
    value: 456,
    suffix: '人',
  },
};