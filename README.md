# Reading

一个基于 Monorepo 架构的全栈阅读平台项目，包含 C 端用户阅读应用与 B 端管理后台，采用现代化前端工程化方案与 Python 后端服务构建。

## 项目特性

- **Monorepo 架构**：基于 pnpm workspace 统一管理前后端代码与公共包
- **前后端分离**：TypeScript 前端 + Python 后端，职责清晰
- **双端并行**：同时支持 C 端用户产品与 B 端管理系统
- **工程化完善**：内置 CI/CD、Storybook 组件库、代码规范等基础设施
- **模块化设计**：公共组件、工具函数抽离为独立 packages，复用性强

## 技术栈

### 前端
- **语言**：TypeScript
- **框架**：React 19 + Vite
- **包管理**：pnpm + workspace
- **组件开发**：Storybook
- **样式**：Tailwind CSS + CSS Variables

### 后端
- **语言**：Python 3.11+
- **框架**：FastAPI + SQLAlchemy 2.0 async
- **数据库**：SQLite（开发）/ MySQL（生产）

### 工程化
- **CI/CD**：GitHub Actions
- **代码规范**：ESLint + Ruff + Prettier

## 项目结构

```
Reading/
├── .github/workflows/      # CI/CD 工作流配置
├── apps/
│   ├── web/                # C 端读者 Web 站 (React 19, Vite, port 5173)
│   └── admin/              # B 端管理后台 (Ant Design 5, Vite, port 5174)
├── backend/                # 后端 FastAPI 服务 (port 8000)
├── packages/
│   ├── tokens/             # 设计令牌 (@novel/tokens)
│   ├── icons/              # 图标库 (@novel/icons)
│   ├── types/              # 共享 TS 类型 (@novel/types)
│   ├── components/         # C 端通用组件 (@novel/components)
│   └── b-end/              # B 端通用组件 (@novel/b-end)
├── tools/token-scanner/    # 令牌扫描工具
├── monitoring/             # Playwright 智能巡检 (49 项检查)
├── scripts/                # 部署与验证脚本
├── .monkeycode/docs/       # 项目文档
└── pnpm-workspace.yaml     # pnpm monorepo 配置
```

## 快速开始

### 环境要求
- Node.js >= 20
- pnpm >= 10
- Python >= 3.11

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/lobster-xiaozhua/Reading.git
cd Reading

# 安装全部依赖
pnpm install
```

### 启动开发

#### 前端开发
```bash
# 启动 C 端应用 (port 5173)
cd apps/web && pnpm dev

# 启动 B 端管理后台 (port 5174)
cd apps/admin && pnpm dev

# 启动 Storybook 组件库 (port 6006)
pnpm storybook
```

#### 后端开发
```bash
cd backend
# 安装 Python 依赖
pip install -e ".[dev]"
# 启动服务 (port 8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 代码检查与构建
```bash
# 全量类型检查
pnpm typecheck

# 全量构建
pnpm build

# 运行测试
pnpm test
```

## 项目文档

详细文档位于 `.monkeycode/docs/`，包含架构总览、API 接口文档、开发者指南等。

## 巡检

```bash
# 全量 Playwright 巡检 (49 项检查)
bash monitoring/run.sh
```