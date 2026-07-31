/* ============================================================
 * P0-14 · Storybook preview 全局装饰
 * - 注入 @novel/tokens 全量令牌 CSS
 * - AtlasAdminProvider（ThemeProvider + AntD ConfigProvider）包裹
 * - 工具栏：light / dark 主题切换
 * ============================================================ */

import type { Preview } from '@storybook/react';
import { AtlasAdminProvider } from '../apps/admin/src/theme/AtlasAdminProvider';
import '../apps/admin/src/styles/global.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'padded',
    backgrounds: {
      grid: {
        cellSize: 8,
        opacity: 0.5,
        cellAmount: 4,
      },
    },
    a11y: {
      // WCAG 2.2 AA 标准
      config: {
        rules: [
          {
            // B 端表格数值列 tabular-nums 是设计要求，不要求对比度
            id: 'color-contrast',
            reviewOnFail: true,
          },
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      name: '主题',
      description: 'UI 主题切换',
      defaultValue: 'system',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
          { value: 'system', icon: 'circlehollow', title: 'System' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => (
      <AtlasAdminProvider defaultUITheme={context.globals.theme}>
        <Story />
      </AtlasAdminProvider>
    ),
  ],
};

export default preview;
