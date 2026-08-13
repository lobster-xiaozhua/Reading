# ============================================================
# 前端 Dockerfile — 多阶段构建（Node → Nginx）
# 构建:  docker build -t novel-frontend .
# Nginx 同时服务 C/B 端，并反代 /api /uploads 到后端
#   C 端  http://<host>/          (apps/web)
#   B 端  http://<host>:8080/     (apps/admin)
# ============================================================

# ── Stage 1: 构建共享 packages + 两个前端应用 ──────────────────
FROM node:20-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /repo
COPY . .

# 用 workspace 协议安装，避免重新解析 registry
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# 按依赖顺序构建（tokens → icons → types → components → b-end）
RUN pnpm --filter @novel/tokens run build \
    && pnpm --filter @novel/icons run build \
    && pnpm --filter @novel/types run build \
    && pnpm --filter @novel/components run build \
    && pnpm --filter @novel/b-end run build

# 构建前端应用
RUN pnpm --filter @novel/web run build
RUN pnpm --filter @novel/admin run build

# ── Stage 2: Nginx 托管 ──────────────────────────────────────
FROM nginx:1.27-alpine

# 复制构建产物
COPY --from=build /repo/apps/web/dist      /usr/share/nginx/html/web
COPY --from=build /repo/apps/admin/dist    /usr/share/nginx/html/admin

# 站点配置（80=C端, 8080=B端, /api|/uploads 反代后端）
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]