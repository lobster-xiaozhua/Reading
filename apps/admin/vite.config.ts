import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(async () => {
  const plugins = [react()];

  if (process.env.ANALYZE) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }));
  }

  return {
    plugins,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    host: true,
    allowedHosts: ['.monkeycode-ai.online'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['antd', '@ant-design/icons'],
          'util-vendor': ['zustand', '@tanstack/react-query', 'dayjs', 'i18next', 'react-i18next'],
          'dnd-kit': ['@dnd-kit/core', '@dnd-kit/modifiers', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
  };
});
