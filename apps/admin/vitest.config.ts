import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    pool: 'forks',
    poolOptions: { forks: { maxForks: 2, minForks: 1 } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.stories.tsx', 'src/main.tsx', 'src/**/index.ts'],
      thresholds: {
        lines: 2,
        functions: 19,
        branches: 38,
      },
    },
  },
});
