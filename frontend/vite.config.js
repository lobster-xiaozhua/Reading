import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*"],
      manifest: {
        name: "云笈阁 · 在线书库",
        short_name: "云笈阁",
        description: "免费在线小说阅读网站，支持整本上传、离线阅读、阅读进度同步",
        theme_color: "#3b82f6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        lang: "zh-CN",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /\/api\/books\/.+\/chapters\//,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "chapters",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 * 7 },
            },
          },
          {
            urlPattern: /\/api\/cover\//,
            handler: "CacheFirst",
            options: {
              cacheName: "covers",
              expiration: { maxEntries: 30, maxAgeSeconds: 86400 * 30 },
            },
          },
          {
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/") || id.includes("node_modules/scheduler")) return "vendor";
          if (id.includes("node_modules/react-router")) return "router";
        },
      },
    },
    minify: "esbuild",
    target: "es2020",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
