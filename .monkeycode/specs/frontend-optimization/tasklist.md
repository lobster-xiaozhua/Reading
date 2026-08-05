# 前端全量优化美化实施计划

## Phase 1: 设计令牌增强 (packages/tokens)

- [x] 1.1 tokens CSS 新增暗色模式变量
- [x] 1.2 tokens 新增动画动效令牌
- [x] 1.3 tokens 构建验证

## Phase 2: C 端读者站优化 (apps/web)

- [x] 2.1 LoginPage 硬编码像素值替换为设计令牌
- [x] 2.2 替换 emoji 图标为 SVG 图标（SearchPage, ProfilePage, BookDetailPage, ReadingStatsPage）
- [x] 2.3 DiscoverPage 使用 LazyImage 替换原生 img
- [x] 2.4 全局 CSS 启用 color-scheme light dark
- [x] 2.5 修复 Carousel 阴影硬编码
- [x] 2.6 添加骨架屏和空状态

## Phase 3: B 端管理后台优化 (apps/admin)

- [x] 3.1 提取 AuditWorkbenchPage 内联样式为 CSS 类
- [x] 3.2 提取 WorkbenchPage 内联样式为 CSS 类
- [x] 3.3 提取 PermissionPage 内联样式为 CSS 类
- [x] 3.4 全局 CSS 启用 color-scheme light dark
- [x] 3.5 图标按钮添加 aria-label

## Phase 4: 构建验证与修复

- [x] 4.1 构建 tokens 包
- [x] 4.2 构建 C 端项目
- [x] 4.3 构建 B 端项目
- [x] 4.4 修复构建错误

> 说明：Phase 1-2 与 Phase 3 大部分此前已完成（代码已实现但 tasklist 未维护），
> 2026-08-05 完成剩余项：3.1 AuditWorkbenchPage 固定宽度内联样式提取
> （`awb-sidebar-filter` / `awb-reject-reason`）、3.4 admin 全局 `color-scheme: light dark`、
> 3.5 ChapterListPage 纯图标按钮 aria-label，并同步勾选全部条目。
