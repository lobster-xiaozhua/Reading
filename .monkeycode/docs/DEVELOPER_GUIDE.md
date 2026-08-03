# 开发者指南

## 环境要求

| 工具 | 版本要求 | 验证命令 |
|------|----------|----------|
| Node.js | >= 20 | `node --version` |
| pnpm | >= 10 | `pnpm --version` |
| Python | >= 3.11 | `python3 --version` |
| Git | >= 2.39 | `git --version` |

## 快速开始

### 1. 安装依赖

```bash
# 后端依赖
cd /workspace/backend && pip install -e ".[dev]"

# 前端依赖
cd /workspace && pnpm install
```

### 2. 构建共享包

```bash
# 按依赖顺序构建
pnpm build
```

### 3. 启动服务

```bash
# 一键启动所有服务
bash start.sh

# 或逐个启动
# 后端
cd /workspace/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# B 端管理后台
cd /workspace/apps/admin && pnpm dev &

# C 端前端
cd /workspace/apps/web && pnpm dev &
```

### 端口分配

| 服务 | 端口 | 访问地址 |
|------|------|----------|
| 后端 API | 8000 | http://localhost:8000 |
| B 端管理后台 | 5174 | http://localhost:5174 |
| C 端 Web | 5173 | http://localhost:5173 |
| Storybook | 6006 | http://localhost:6006 |

## 项目命令

### 根目录命令

| 命令 | 说明 |
|------|------|
| `pnpm build` | 构建所有 packages（tokens → icons → types → components → b-end） |
| `pnpm typecheck` | 全量 TypeScript 类型检查（8 个包） |
| `pnpm run ci` | CI 全流程: lint → typecheck → token-scan → import-audit → test |
| `pnpm run token-scan` | 代码安全扫描（检查裸色值、非令牌间距等） |
| `pnpm run import-audit` | B 端 import 审计（禁止从 `@novel/components` 导入基础组件） |
| `pnpm storybook` | 启动 Storybook（端口 6006） |
| `pnpm run monitor` | 全量 Playwright 巡检（41 项检查） |

### 后端命令

| 命令 | 说明 |
|------|------|
| `ruff check app/` | 代码检查 |
| `python -m pytest tests/ -v --tb=short` | 运行测试（162 个） |

## 项目结构

### 后端分层

详见 [模块/后端三层架构.md](./模块/后端三层架构.md) 完整说明。

```
backend/app/
├── api/           # API 路由层
│   ├── c_end/     # C 端路由
│   ├── b_end/     # B 端路由
│   └── deps.py    # 依赖注入（当前用户、权限校验）
├── core/          # 核心配置（数据库、Redis、安全、异常）
├── middlewares/    # 中间件（链路追踪、异常处理）
├── models/        # SQLAlchemy ORM 模型
├── repositories/  # 数据访问层
├── schemas/       # Pydantic 数据模型
├── services/      # 业务逻辑层
└── utils/         # 工具类（状态机、敏感词 Trie）
```

### 前端 C 端（详见 [模块/前端C端.md](./模块/前端C端.md)）

```
apps/web/src/
├── api/           # API 调用层（fetcher + http 客户端 + 类型 + mock 数据）
├── components/    # 通用组件（NavBar、Carousel、LazyImage 等 12 个）
├── hooks/         # 自定义 Hook（useNetworkStatus、useOfflineCache）
├── layouts/       # 布局组件（AppLayout、ReaderLayout）
├── pages/         # 页面组件（11 个页面）
├── stores/        # Zustand 状态管理（auth、history、search、user）
├── styles/        # 全局样式
└── utils/         # 工具函数（性能监控）
```

### 前端 B 端（详见 [模块/前端B端管理后台.md](./模块/前端B端管理后台.md)）

```
apps/admin/src/
├── api/           # API 调用层（按领域拆分：novel、chapter、audit 等）
├── components/    # 通用组件（Authorized、ErrorBoundary）
├── constants/     # 权限常量
├── hooks/         # 自定义 Hook（usePermission）
├── i18n/          # 国际化（中文语言包）
├── layouts/       # 布局组件（BEndLayout、SiderMenu、HeaderBar、MultiTabs）
├── pages/         # 页面组件（13 个页面）
├── router/        # 路由守卫（RequireAuth、RequirePermission）
├── stores/        # Zustand 状态管理（auth、tab）
├── templates/     # 页面模板（Dashboard、DetailCard、FormPage、ListPage）
├── theme/         # 主题配置（AtlasAdminProvider、Token 映射）
└── styles/        # 全局样式
```

## 开发规范

### Git 分支命名

```
YYMMDD-(feat|fix|chore|refactor)-xxxxx-xxxx-xxxx
```

### 代码风格

- 后端: Ruff 自动检查（配置在 `pyproject.toml`）
- 前端: ESLint（当前为占位符，实际无 lint 检查）
- TypeScript: 严格模式，`noUnusedLocals`、`noUnusedParameters` 开启

### 类型检查

```bash
# 全量类型检查
pnpm typecheck

# 单独检查某个包
cd packages/components && pnpm typecheck
```

### 构建顺序

共享包有严格的构建顺序依赖：

```
1. tokens （零依赖）
2. icons  （依赖 tokens 的 CSS 变量）
3. types  （零依赖）
4. components （依赖 tokens + icons）
5. b-end  （依赖 tokens + icons + types）
```

## 测试

### 后端测试

```bash
cd /workspace/backend
python -m pytest tests/ -v --tb=short
```

- 162 个测试用例
- 使用内存 SQLite + fakeredis，无需外部依赖
- 测试覆盖：API 端点、服务层、状态机、敏感词扫描

### 前端巡检

```bash
# 全量巡检
pnpm run monitor

# 分类巡检
pnpm run monitor:health   # 仅健康检查
pnpm run monitor:api      # 仅 API 巡检
pnpm run monitor:page     # 仅页面渲染巡检
pnpm run monitor:flow     # 仅业务链路巡检
```

Playwright 巡检共 41 项检查（详见 [模块/监控巡检.md](./模块/监控巡检.md)）：

| 套件 | 检查项数 | 说明 |
|------|---------|------|
| health | 3 | 后端 /health、C/B 端 API 根路径 |
| api.b-end | 11 | 作品、工作台、审核、用户、角色、系统配置、稿费、敏感词、图表 |
| api.c-end | 11 | 书籍、分类、详情、章节、评论、评分、推荐、发现页、搜索、热搜 |
| pages.b-end | 3 | 登录页、404、控制台错误 |
| pages.c-end | 7 | 发现页、登录页、详情页、分类页、搜索页、404、控制台错误 |
| business-flow | 6 | 端到端业务链路 |

## 开发模式说明

### Auth 降级

开发模式下，不传 Token 时自动降级：
- **B 端**: 降级为 demo 超级管理员（用户名: admin, 密码: admin123）
- **C 端**: 降级为 demo 读者（ID: 1001）

### 数据库

- 开发模式使用 SQLite，启动时自动 `create_all` 建表
- 数据库文件: `backend/novel.db`
- 生产环境切换 MySQL（配置 `db_url` 环境变量）

### Redis 降级

- Redis 不可用时自动降级为 fakeredis 内存模拟
- 生产环境需配置有效的 `redis_url`

## 部署

### 构建

```bash
# 构建所有前端包
pnpm build

# 构建 C 端
cd /workspace/apps/web && pnpm build

# 构建 B 端
cd /workspace/apps/admin && pnpm build
```

### 生产环境依赖

- 数据库: MySQL 8.0+
- 缓存: Redis 7+
- 搜索（可选）: Elasticsearch 8
- ASGI 服务器: Gunicorn + Uvicorn workers