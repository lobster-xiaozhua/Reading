# AGENTS.md — 小说阅读平台

## 项目结构

pnpm monorepo，workspace 含 `packages/*` `tools/*` `apps/*`。

| 目录 | 职责 | 入口 |
|------|------|------|
| `apps/web/` | C 端读者 Web 站 (React 19, Vite, port 5173) | `src/main.tsx` |
| `apps/admin/` | B 端管理后台 (React 19, Ant Design 5, Vite, port 5174) | `src/main.tsx` |
| `backend/` | 后端 FastAPI (Python 3.11+, SQLAlchemy 2.0 async, port 8000) | `app/main.py:create_app()` |
| `packages/tokens/` | 设计令牌 (`@novel/tokens`) | 先构建 |
| `packages/icons/` | 图标库 (`@novel/icons`) | 先构建 |
| `packages/types/` | 共享 TS 类型 (`@novel/types`) | 先构建 |
| `packages/components/` | C 端通用组件 (`@novel/components`) | 依赖 tokens/icons/types |
| `packages/b-end/` | B 端通用组件 (`@novel/b-end`) | 依赖 tokens/types |
| `monitoring/` | Playwright 智能巡检 (41 项检查) | `monitoring/playwright.config.ts` |

## 启动服务

```bash
# 后端 (必须先启动)
cd /workspace/backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# B 端管理后台
cd /workspace/apps/admin && pnpm dev &

# C 端前端
cd /workspace/apps/web && pnpm dev &
```

## 关键命令

```bash
pnpm build                    # 构建所有 packages (build 顺序: tokens → icons → types → components → b-end)
pnpm typecheck                # 全量 TS 类型检查 (8 个包)
pnpm run ci                   # CI 全流程: lint → typecheck → token-scan → import-audit → test → build
pnpm run validate              # 本地预检 (模拟 CI 全流程)
pnpm run validate:quick        # 快速预检 (跳过构建和慢速测试)
pnpm run token-scan           # 代码安全扫描 (token-scanner 工具)
pnpm run import-audit         # B 端 import 审计
pnpm storybook                # 启动 Storybook (port 6006)
bash monitoring/run.sh        # 全量 Playwright 巡检
pnpm audit                    # 前端依赖漏洞扫描
pip-audit                     # 后端依赖漏洞扫描 (backend/ 目录)

## 部署

```bash
bash scripts/deploy.sh              # 生产部署（构建 + 后端 + 前端）
bash scripts/deploy.sh --skip-build # 仅重启服务，跳过构建
bash scripts/deploy.sh --skip-backend  # 仅部署前端
bash scripts/deploy.sh --skip-frontend # 仅部署后端

# 测试环境（一键启动 + 测试 + 巡检）
bash scripts/deploy-test.sh              # 完整部署 + 测试 + 巡检
bash scripts/deploy-test.sh --no-test    # 跳过测试
bash scripts/deploy-test.sh --no-monitor # 跳过巡检
bash scripts/deploy-test.sh --quick      # 仅启动服务，跳过构建/测试/巡检
```
```

## 后端开发

- 依赖安装: `pip install -e ".[dev]"` (在 `backend/` 目录)
- 代码检查: `ruff check app/` (配置见 `pyproject.toml`)
- 测试: `python -m pytest tests/ -v --tb=short` (306 个测试, 84% 覆盖率门禁 70%)
- 后端 API 统一前缀: `/api/v1/c` (C 端), `/api/v1/b` (B 端)
- 统一响应格式: `{ code: 0, message: "ok", data: ..., traceId: "..." }` (code=0 成功)
- Schema 自动 snake_case → camelCase 序列化 (基于 `CamelModel` 基类)
- Auth 降级: 无 token 时自动降级为 demo 管理员/读者 (开发友好)
- 项目启动时自动 `create_all` 建表 (开发模式)
- 种子数据: 启动时自动检测并写入 (DEBUG=true, 已存在则跳过)

## 前端注意

- `@/` 路径别名指向 `src/` (Vite resolve alias)
- 前端 lint 目前是占位符 (`echo 'lint placeholder'`)，实际无 lint 检查
- B 端使用 Ant Design 5.x + react-hotkeys-hook + zustand
- C 端使用 zustand + 自定义组件库 (`@novel/components`)
- 路由懒加载 (React.lazy + Suspense)
- B 端路由守卫: `RequireAuth` (登录校验) + `RequirePermission` (权限点校验)

## 巡检

```bash
pnpm run monitor              # 全量 41 项检查
pnpm run monitor:health       # 仅后端健康检查
pnpm run monitor:api          # 仅 API 接口巡检
pnpm run monitor:page         # 仅前端页面渲染巡检
pnpm run monitor:flow         # 仅业务链路巡检
```

## 项目文档

项目文档位于 `.monkeycode/docs/`，包含完整 wiki：

| 文档 | 说明 |
|------|------|
| `INDEX.md` | 文档索引 |
| `ARCHITECTURE.md` | 系统架构总览（Monorepo 结构、分层设计、架构决策） |
| `INTERFACES.md` | API 接口文档（C/B 端全部端点、响应格式、鉴权） |
| `DEVELOPER_GUIDE.md` | 开发者指南（环境搭建、构建、测试、部署） |
| `专有概念/` | 核心概念：三层令牌架构、状态机、双 Token 鉴权、作品状态流转、敏感词系统、权限体系 |
| `模块/` | 模块文档：后端三层架构、C 端、B 端管理后台、设计系统、图标库、共享类型、监控巡检 |
| `原始设计文档/` | 原始设计规范文档（已归档） |

## 架构约定

- 后端 API 模块按端隔离: `backend/app/api/b_end/` vs `c_end/`
- 后端服务层: `services/` → 仓储层: `repositories/` → ORM: `models/`
- 前端 API 层: `api/fetcher.ts` (C 端) / `api/fetcher.ts` (B 端)，统一通过 `http` 客户端调用
- 状态管理: zustand (前后端分离 store)