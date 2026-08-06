# C 端读者 Web 站镜像：pnpm 构建产物 + Nginx（静态 + /api 反代后端）
# 构建上下文为仓库根目录：docker build -f infra/web.Dockerfile .
FROM node:22-alpine AS build
WORKDIR /repo

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/tsconfig.json apps/web/tsconfig.app.json apps/web/vite.config.ts apps/web/tailwind.config.js apps/web/postcss.config.js ./apps/web/
COPY packages/tokens/package.json ./packages/tokens/
COPY packages/icons/package.json ./packages/icons/
COPY packages/types/package.json ./packages/types/
COPY packages/components/package.json ./packages/components/
COPY packages/tokens ./packages/tokens
COPY packages/icons ./packages/icons
COPY packages/types ./packages/types
COPY packages/components ./packages/components
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @novel/web run build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
