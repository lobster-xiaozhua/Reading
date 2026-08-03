# B 端管理后台

## 概述

面向运营团队的小说平台管理系统，提供内容管理、审核流程、数据分析和系统配置功能。权限体系详见 [权限体系](../专有概念/权限体系.md)，鉴权详见 [双Token鉴权](../专有概念/双Token鉴权.md)。

- 技术栈: React 19 + Ant Design 5.x + TypeScript + React Query + Zustand
- 构建工具: Vite 5
- 开发端口: 5174
- 包名: `@novel/admin`

## 页面功能

### 工作台 (`/workbench`)

运营数据总览：

- KPI 卡片（作品数、章节数、读者数、今日新增）
- 字数增长趋势图
- 运营概览
- 快捷操作入口

### 作品管理 (`/novel`)

完整的内容管理流程（作品状态流转详见 [专有概念/作品状态流转.md](../专有概念/作品状态流转.md)）：

- **列表页**: 搜索/筛选/分页/批量操作（上下架/审核/删除）
- **详情页**: 基本信息 + 统计 + 审核历史 + 评论
- **表单页**: 新建/编辑作品（封面上传、章节树勾选）

### 章节管理 (`/chapter/:novelId`)

- 章节列表（拖拽排序、行内编辑）
- 创建章节（TipTap 富文本编辑器，14 个工具栏按钮，详见 [模块/设计系统.md](./设计系统.md)）
- 状态流转（草稿 → 待审核 → 发布 → 下架，详见 [状态机](../专有概念/状态机.md)）
- 敏感词实时扫描（红色/黄色波浪线标记，详见 [敏感词系统](../专有概念/敏感词系统.md)）

### 审核工作台 (`/audit`)

双栏布局：

- 左侧: 待审队列（按提交时间排序，显示级别和状态统计）
- 右侧: 内容预览 + 敏感词命中详情 + 审核历史 + 操作按钮（通过/驳回）

### 数据看板 (`/charts`)

基于 `@ant-design/charts` 的业务图表：

- 基础图表 + 5 个小说专用业务图表
- 共享配置（6 色色板、暗黑模式自适应、空数据占位）

### 稿费管理 (`/royalty`)

- 统计卡片（总金额、待结算、已结算、已提现）
- 稿费明细列表
- 批量结算/标记提现

### 角色权限 (`/permission`)

- 左侧: 角色列表
- 右侧: 权限树（按模块分组，支持分配/回收）
- 支持编辑角色名称和描述

### 其他页面

- **用户列表** (`/user`): 读者搜索/筛选/封禁解封
- **系统设置** (`/system`): 站点配置 + 敏感词库管理
- **登录页** (`/login`): 登录表单，支持 redirect 跳转

## 布局

### 主布局（BEndLayout）

- 侧边栏导航: 240px 宽度，权限感知菜单
- 顶部栏: 面包屑 + 全局搜索 + 通知 + 用户菜单
- 多 Tab 页签: 打开页面自动添加 Tab，可关闭/刷新
- 暗黑模式: CSS 变量切换，表格/图表/侧边栏均有适配

## 状态管理

### authStore

- 持久化 Key: `atlas-admin-auth`
- 自动 Token 刷新（5 分钟临近过期阈值）
- `hasPermission(perm)`/`hasRole(role)` 检查方法

### tabStore

- 持久化 Key: `atlas-admin-tabs`
- 多 Tab 管理（首页 Tab 不可关闭）

## 路由守卫

### RequireAuth

- 未认证重定向到 `/login?redirect=...`
- 自动检测 Token 过期，静默刷新

### RequirePermission

- 细粒度权限校验
- 超级管理员直接放行
- 无权限显示 403 页面

## 页面模板

4 个通用模板，覆盖所有状态变体：

| 模板 | 状态变体 |
|------|----------|
| ListPageTemplate | idle/loading/empty/error/no-permission/no-search-result |
| DashboardTemplate | loading/ready/empty/error/chart-error |
| DetailCardTemplate | loading/ready/not-found/offline |
| FormPageTemplate | loading/editing/submitting/success |

## 主题集成

通过 `AtlasAdminProvider` 集成：

- `@novel/tokens/react` 的 ThemeProvider 管理 `data-theme`
- Ant Design ConfigProvider 注入 40+ 项 Token 映射
- 暗色模式主色提亮
- 组件级覆盖：Table（紧凑型）、Button（高度）、Form（间距）、Card（内边距）、Menu（侧边栏样式）