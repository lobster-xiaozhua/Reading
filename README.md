# Atlas Novel Reader

> 版本: v1 | 一个基于 Monorepo 架构的全栈阅读平台，包含 C 端读者应用与 B 端管理后台。

## 项目特性

- **Monorepo 架构**：基于 pnpm workspace 统一管理前后端代码与公共包
- **前后端分离**：TypeScript 前端 + Python 后端，职责清晰
- **双端并行**：C 端读者产品 + B 端管理系统
- **体验完善**：骨架屏/空态/错误态、移动端适配、PWA 离线阅读、B 端统一控制面板
- **工程化完善**：CI 门禁、Storybook 组件库、代码规范、630 项后端测试、127 项全局真实请求检查

## 技术栈

- **前端**：React 19 + Vite + TypeScript，C 端自定义组件库，B 端 Ant Design 5
- **后端**：Python 3.11 + FastAPI + SQLAlchemy 2.0 async
- **数据库**：SQLite（开发，零依赖）/ MySQL（生产，docker-compose + Alembic 迁移）
- **缓存**：Redis（开发环境连接失败自动降级 fakeredis）

## 项目结构

```
Reading/
├── apps/
│   ├── web/                # C 端读者 Web 站 (port 5173)
│   └── admin/              # B 端管理后台 (port 5174)
├── backend/                # 后端 FastAPI 服务 (port 8000)
├── packages/               # tokens/icons/types/components/b-end 共享包
├── tools/                  # token-scanner 安全扫描
├── monitoring/             # Playwright 智能巡检 (68 项检查)
├── scripts/                # 部署与验证脚本
└── .monkeycode/docs/       # 项目文档
```

## 快速开始

### 环境要求

- Node.js >= 20，pnpm >= 10，Python >= 3.11

### 安装依赖

```bash
pnpm install
cd backend && pip install -e ".[dev]"
```

### 一键启动（推荐）

```bash
bash start.sh          # 后端(8000) + B端(5174) + C端(5173)，自动建表 + 种子数据
```

> 开发模式默认 `DEBUG=true`：自动建表、自动写入种子数据、无 token 时自动降级演示账号、Redis 失败降级 fakeredis。

### 分步启动

```bash
# 后端（必须先启动）
cd backend && DEBUG=true uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# B 端管理后台 (port 5174)
cd apps/admin && pnpm dev

# C 端读者站 (port 5173)
cd apps/web && pnpm dev
```

> 注意：后端必须以 `DEBUG=true` 启动才会自动建表 + 写入种子数据。

### 演示账号

| 端 | 账号 | 密码 | 说明 |
|----|------|------|------|
| B 端后台 | `admin` | `admin123` | 超级管理员（全部权限） |
| C 端读者 | `reader` | `reader123` | 普通读者 |

> 登录页提供「演示账号」一键填充，无需手输。生产环境请更换密码并关闭 DEBUG。

## 代码检查与构建

```bash
pnpm typecheck        # 全量类型检查（8 包）
pnpm run lint         # 全量 ESLint（--max-warnings=0）
pnpm run ci           # CI 全流程：lint → typecheck → token-scan → import-audit → test → build
cd backend && ruff check app tests   # 后端 lint
cd backend && python3 scripts/test-platform/run.py --full   # 后端 630 项测试
```

## 部署

```bash
bash scripts/deploy.sh                # 生产部署（构建 + 后端 + 前端）
bash scripts/deploy-test.sh           # 测试环境：一键部署 + 测试 + 巡检
bash selfcheck/run.sh start           # 常驻自检服务（127+ 项真实请求）
```

## 项目文档

详细文档位于 `.monkeycode/docs/`：架构总览、API 接口文档、开发者指南、V1 交付规划等。

## 巡检

```bash
bash monitoring/run.sh            # 全量 Playwright 巡检（68 项检查）
pnpm run global-check             # 全局真实请求检查（127 项）
```
