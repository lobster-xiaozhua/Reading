# 前端全量优化美化实施计划

## Phase 1: 设计令牌增强 (packages/tokens)

- [ ] 1.1 tokens CSS 新增暗色模式变量
- [ ] 1.2 tokens 新增动画动效令牌
- [ ] 1.3 tokens 构建验证

## Phase 2: C 端读者站优化 (apps/web)

- [ ] 2.1 LoginPage 硬编码像素值替换为设计令牌
- [ ] 2.2 替换 emoji 图标为 SVG 图标（SearchPage, ProfilePage, BookDetailPage, ReadingStatsPage）
- [ ] 2.3 DiscoverPage 使用 LazyImage 替换原生 img
- [ ] 2.4 全局 CSS 启用 color-scheme light dark
- [ ] 2.5 修复 Carousel 阴影硬编码
- [ ] 2.6 添加骨架屏和空状态

## Phase 3: B 端管理后台优化 (apps/admin)

- [ ] 3.1 提取 AuditWorkbenchPage 内联样式为 CSS 类
- [ ] 3.2 提取 WorkbenchPage 内联样式为 CSS 类
- [ ] 3.3 提取 PermissionPage 内联样式为 CSS 类
- [ ] 3.4 全局 CSS 启用 color-scheme light dark
- [ ] 3.5 图标按钮添加 aria-label

## Phase 4: 构建验证与修复

- [ ] 4.1 构建 tokens 包
- [ ] 4.2 构建 C 端项目
- [ ] 4.3 构建 B 端项目
- [ ] 4.4 修复构建错误