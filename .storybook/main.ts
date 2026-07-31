/* ============================================================
 * P0-14 · Storybook v8 主配置
 * - Vite + React 构建器
 * - 自动加载 stories：packages/b-end 与 apps/admin
 * - addon-essentials + addon-a11y + addon-interactions
 * ============================================================ */

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../packages/b-end/src/**/*.stories.@(ts|tsx)',
    '../apps/admin/src/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../apps/admin/public'],
};

export default config;
