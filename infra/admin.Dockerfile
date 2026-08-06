# B 端管理后台镜像：pnpm 构建产物 + Nginx（静态 + /api 反代后端）
# 构建上下文为仓库根目录：docker build -f infra/admin.Dockerfile .
FROM node:22-alpine AS build
WORKDIR /repo

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/admin/package.json apps/admin/tsconfig.json apps/admin/tsconfig.app.json apps/admin/vite.config.ts ./apps/admin/
COPY packages/tokens/package.json ./packages/tokens/
COPY packages/icons/package.json ./packages/icons/
COPY packages/types/package.json ./packages/types/
COPY packages/components/package.json ./packages/components/
COPY packages/b-end/package.json ./packages/b-end/
COPY packages/tokens ./packages/tokens
COPY packages/icons ./packages/icons
COPY packages/types ./packages/types
COPY packages/components ./packages/components
COPY packages/b-end ./packages/b-end
COPY apps/admin ./apps/admin

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @novel/admin run build

FROM nginx:alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
