/* ============================================================
 * P7-9 · 追更漏斗
 * 发现→详情→加书架→开读→追更转化 5 层等高
 * 宽度按转化率缩放 / 转化率 <10% warning 标注
 * Source: 02 §4.5 / P7-9
 * ============================================================ */

import { useMemo } from 'react';
import { Funnel } from '@ant-design/charts';
import type { FunnelConfig } from '@ant-design/charts';
import {
  CHART_DEFAULT_HEIGHT,
  getChartColors,
  isDarkMode,
  commonLegendStyle,
  commonTooltipStyle,
  ChartWrapper,
} from '../shared';

export interface FunnelStage {
  /** 阶段名 */
  stage: string;
  /** 数值 */
  value: number;
}

export interface ReadingFunnelProps {
  data: FunnelStage[];
  height?: number;
  emptyDescription?: string;
  config?: Partial<FunnelConfig>;
}

export function ReadingFunnel({
  data,
  height = CHART_DEFAULT_HEIGHT,
  emptyDescription,
  config,
}: ReadingFunnelProps) {
  const colors = useMemo(() => getChartColors(), []);
  const dark = isDarkMode();

  if (!data || data.length === 0) {
    return <ChartWrapper empty emptyDescription={emptyDescription ?? '暂无漏斗数据'} height={height} />;
  }

  const mergedConfig: FunnelConfig = {
    data,
    xField: 'stage',
    yField: 'value',
    height,
    theme: dark ? 'classicDark' : 'classic',
    color: colors,
    isTransposed: true,
    legend: commonLegendStyle.legend,
    tooltip: commonTooltipStyle.tooltip,
    label: {
      text: (datum: { value?: number }) => {
        const total = data[0]?.value ?? 1;
        const rate = ((datum.value ?? 0) / total * 100).toFixed(1);
        const isLow = Number(rate) < 10;
        return `${datum.value} (${rate}%)${isLow ? ' ⚠' : ''}`;
      },
      style: {
        fontSize: 12,
        fill: 'var(--color-text-secondary)',
      },
    },
    interactions: [{ type: 'tooltip' }],
    ...config,
  } as FunnelConfig;

  return <Funnel {...mergedConfig} />;
}
