# 系统架构文档

## 项目概述

Atlas Novel Reader 是一个完整的小说阅读平台，包含 C 端读者 Web 站、B 端管理后台和 Python FastAPI 后端。采用 pnpm Monorepo 管理，9 个 workspace 项目。

### 项目定位

- **C 端**：面向读者的消费级产品，强调阅读体验、内容发现和社区互动
- **B 端**：面向运营团队的管理系统，强调内容管理、审核流程和数据分析
- **后端**：统一提供 RESTful API，C/B 端路由物理隔离

### 版本

- 后端: 2.1.0
- 设计系统: 1.0.0
- Monorepo: 0.1.0

---

## 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                │
│   ┌──────────────────────┐  ┌──────────────────────────┐    │
│   │  C 端读者 Web 站      │  │  B 端管理后台             │    │
│   │  (apps/web)           │  │  (apps/admin)             │    │
│   │  React 19 + Vite 5   │  │  React 19 + Ant Design 5 │    │
│   │  Port 5173            │  │  Port 5174               │    │
│   └──────────┬───────────┘  └───────────┬──────────────┘    │
│              │                           │                   │
│              └──────────┬────────────────┘                   │
│                         │ HTTP (Vite proxy)                  │
├─────────────────────────┼───────────────────────────────────┤
│                    API 网关层                                │
│                         │                                    │
│              ┌──────────┴───────────┐                        │
│              │  FastAPI Backend      │                        │
│              │  (backend/)           │                        │
│              │  Port 8000            │                        │
│              │                       │                        │
│              │  /api/v1/c/*  (C端)   │                        │
│              │  /api/v1/b/*  (B端)   │                        │
│              └──────────┬───────────┘                        │
│                         │                                    │
├─────────────────────────┼───────────────────────────────────┤
│                    数据层                                    │
│   ┌──────────┐  ┌──────────┐  ┌──────────────────┐         │
│   │  MySQL   │  │  Redis   │  │  SQLite (开发)    │         │
│   │ (生产)   │  │ (缓存)   │  │                   │         │
│   └──────────┘  └──────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    共享包层 (packages/)                       │
│                                                             │
│  tokens → icons → types → components → b-end               │
│  (设计令牌)  (图标)  (类型)  (C端组件)  (B端组件)           │
│                                                             │
│  构建顺序: tokens → icons → types → components → b-end      │
└─────────────────────────────────────────────────────────────┘
```

---

## Monorepo 结构

```
novel-reader-monorepo/
├── apps/
│   ├── web/          # C 端读者 Web 站（React 19, Vite, port 5173）
│   └── admin/        # B 端管理后台（React 19, Ant Design 5, port 5174）
├── packages/
│   ├── tokens/       # 设计令牌（@novel/tokens）
│   ├── icons/        # 图标库（@novel/icons）
│   ├── types/        # 共享 TS 类型（@novel/types）
│   ├── components/   # C 端通用组件（@novel/components）
│   └── b-end/        # B 端专用组件（@novel/b-end）
├── backend/          # Python FastAPI 后端（port 8000）
├── tools/
│   └── token-scanner/ # 设计令牌扫描 + 导入审计工具
├── monitoring/       # Playwright 智能巡检（41 项检查）
├── package.json      # 根 workspace 配置
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── start.sh          # 一键启动脚本
```

### 依赖关系链

```
tokens (@novel/tokens)     ← 最底层，零依赖
   ↑
icons (@novel/icons)       ← 依赖 tokens 的 CSS 变量
   ↑
components (@novel/components)  ← 依赖 tokens + icons
   ↑
b-end (@novel/b-end)       ← 依赖 tokens + icons + types

types (@novel/types)       ← 独立，零依赖（纯 TS 类型）
```

---

## 后端架构

详见 [模块/后端三层架构.md](./模块/后端三层架构.md) 了解完整的分层实现。

### 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| Web 框架 | FastAPI | >=0.111.0 |
| ASGI 服务器 | Uvicorn / Gunicorn | >=0.30.0 |
| ORM | SQLAlchemy 2.0 (async) | >=2.0.30 |
| 数据验证 | Pydantic v2 + Pydantic Settings | >=2.7.0 |
| 数据库驱动 | aiosqlite（开发）/ asyncmy（生产） | - |
| 缓存 | Redis | >=5.0.7 |
| 鉴权 | PyJWT + bcrypt | - |
| 限流 | SlowAPI | >=0.1.9 |

### 三层架构

```
API 路由层 (api/)           → 接收 HTTP 请求，参数校验，路由分发
         ↓
服务层 (services/)          → 业务逻辑编排，事务管理，缓存策略
         ↓
仓储层 (repositories/)      → 数据访问抽象，查询封装，分页
         ↓
ORM 模型层 (models/)        → SQLAlchemy 表映射，关系定义
```

### C/B 端隔离

- **API 前缀**: `/api/v1/c/*`（C 端读者端）、`/api/v1/b/*`（B 端管理后台）
- **路由文件**: `api/c_end/` 和 `api/b_end/` 物理隔离
- **Schema**: `schemas/c_end.py` 和 `schemas/b_end.py` 独立定义
- 服务层和仓储层按需复用，互不交叉

### 统一响应格式（详见 [INTERFACES.md](./INTERFACES.md)）

所有 API 返回统一结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": { ... },
  "traceId": "a1b2c3d4e5f6"
}
```

- `code=0` 表示成功，非零值表示业务错误
- `traceId` 为每个请求的唯一标识，用于链路追踪

### 中间件链

1. **TraceMiddleware** — 注入/透传 `X-Trace-Id` 请求头
2. **CORSMiddleware** — 允许跨域（开发模式允许所有来源）
3. **异常处理器** — 统一处理 `BizError`、`ValidationError`、`HTTPException`、未捕获异常

---

## 前端架构

详见 [模块/前端C端.md](./模块/前端C端.md) 和 [模块/前端B端管理后台.md](./模块/前端B端管理后台.md)。

### C 端读者 Web 站 (`apps/web`)

| 特性 | 技术 |
|------|------|
| 框架 | React 19 |
| 构建 | Vite 5 |
| 路由 | React Router v6 (createBrowserRouter) |
| 状态管理 | Zustand 4 + persist 中间件 |
| 样式 | Tailwind CSS 3 + 设计令牌 CSS 变量 + 组件级 CSS |
| HTTP | 原生 fetch 封装 |
| 代码分割 | React.lazy + Suspense |
| 离线缓存 | IndexedDB（LRU 50MB） |

路由表（11 个页面，全部懒加载）：

| 路径 | 页面 | 布局 |
|------|------|------|
| `/` | 发现页 | AppLayout |
| `/book/:bookId` | 书籍详情 | AppLayout |
| `/category` | 分类页 | AppLayout |
| `/search` | 搜索页 | AppLayout |
| `/profile` | 个人中心 | AppLayout |
| `/stats` | 阅读统计 | AppLayout |
| `/vip` | VIP 订阅 | AppLayout |
| `/follow` | 追更管理 | AppLayout |
| `/read/:bookId/:chapterId?` | 阅读器 | ReaderLayout |
| `/login` | 登录 | 无布局 |
| `/404` | 404 | 无布局 |

### B 端管理后台 (`apps/admin`)

| 特性 | 技术 |
|------|------|
| 框架 | React 19 |
| UI 库 | Ant Design 5.x |
| 构建 | Vite 5 |
| 路由 | React Router v6 + 路由守卫 |
| 状态管理 | Zustand + React Query |
| 国际化 | react-i18next + i18next |
| 拖拽 | @dnd-kit |
| 图表 | @ant-design/charts |

路由表（13 个路径，全部懒加载）：

| 路径 | 页面 | 守卫 |
|------|------|------|
| `/login` | 登录 | 公开 |
| `/` | 重定向到工作台 | RequireAuth |
| `/workbench` | 工作台 | RequireAuth |
| `/novel` | 作品列表 | RequireAuth |
| `/novel/create` | 新建作品 | RequireAuth |
| `/novel/:novelId` | 作品详情 | RequireAuth |
| `/novel/:novelId/edit` | 编辑作品 | RequireAuth |
| `/chapter/:novelId` | 章节列表 | RequireAuth |
| `/audit` | 审核工作台 | RequireAuth |
| `/charts` | 数据看板 | RequireAuth |
| `/royalty` | 稿费管理 | RequireAuth |
| `/user` | 读者列表 | RequireAuth |
| `/permission` | 角色权限 | RequireAuth + RequirePermission |
| `/system` | 系统设置 | RequireAuth |
| `/404` | 404 | 公开 |

---

## 数据流

### 请求生命周期

```
浏览器 → Vite Proxy → FastAPI → TraceMiddleware → CORSMiddleware → 路由分发
    ↓
依赖注入 (get_db, get_current_admin/reader, require_permission)
    ↓
API 路由函数 → 参数校验 (Pydantic) → 服务层调用
    ↓
服务层 → 缓存检查 (Redis) → 仓储层 → 数据库 (SQLAlchemy)
    ↓
ORM → Schema 转换 (CamelModel → camelCase) → 统一响应 → 返回
```

### 鉴权流程

```
请求头 Authorization: Bearer <token>
    ↓
get_current_admin/get_current_reader 依赖注入
    ↓
无 Token? → 降级为 demo 用户（开发模式）
有 Token? → 解码 JWT → Redis 校验会话 → 构造用户上下文
    ↓
require_permission(perm) 可选的细粒度权限校验
```

---

## 关键架构决策

### 1. 三层设计令牌架构

L1 Primitive → L2 Semantic → L3 Component，确保主题切换只需修改 L2 层指向，L1 和 L3 无需变更。详见 [专有概念/三层令牌架构.md](./专有概念/三层令牌架构.md)。

### 2. C/B 端物理隔离

C 端和 B 端的 API 路由、Schema、前端代码完全隔离，避免相互影响。共享部分通过 `@novel/types` 和 `@novel/tokens` 实现。

### 3. 双 Token 鉴权

Access Token（8h） + Refresh Token（30d/90d），JWT 携带用户身份和权限信息，Redis 维护会话状态。详见 [专有概念/双Token鉴权.md](./专有概念/双Token鉴权.md)。

### 4. 状态机模式

作品、章节、稿费状态流转通过 `StateMachine` 基类统一管理，确保状态转换的合法性和可追溯性。详见 [专有概念/状态机.md](./专有概念/状态机.md) 和 [专有概念/作品状态流转.md](./专有概念/作品状态流转.md)。

### 5. 开发体验优先

无 Token 时自动降级为 demo 管理员/读者，开发数据库自动创建，Redis 不可用时自动降级为 fakeredis 内存模拟。

---

## 安全设计

| 领域 | 措施 |
|------|------|
| 密码存储 | bcrypt hash，cost factor = 12 |
| 传输安全 | JWT 签名，HS256 算法 |
| 会话管理 | Redis 维护，登出即失效，Refresh Token 轮换 |
| 限流 | SlowAPI 按端点配置（登录 5 次/分钟，搜索 10 次/分钟） |
| 内容安全 | DFA Trie 敏感词扫描，三级过滤策略（详见 [专有概念/敏感词系统.md](./专有概念/敏感词系统.md)） |
| 输入校验 | Pydantic 严格校验，HTML 消毒（bleach） |
| 权限控制 | 4 层权限体系，后端严格校验（详见 [专有概念/权限体系.md](./专有概念/权限体系.md)） |

---

## 部署架构

### 开发环境

```
start.sh 一键启动:
  1. 后端: uvicorn app.main:app --port 8000
  2. B 端: pnpm dev (port 5174)
  3. C 端: pnpm dev (port 5173)
```

### 生产环境

```
Nginx → 静态文件 (C 端/B 端构建产物)
    ↓ 反向代理
Gunicorn + Uvicorn workers → FastAPI 应用
    ↓
MySQL 8.0 + Redis 7 + Elasticsearch 8
```

### 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| 后端 API | 8000 | FastAPI 应用 |
| C 端 Web | 5173 | Vite 开发服务器 |
| B 端管理后台 | 5174 | Vite 开发服务器 |
| Storybook | 6006 | 组件文档 |