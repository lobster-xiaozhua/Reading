# Requirements Document

## Introduction

后台管理端（B 端）当前的数据展示分散于工作台（WorkbenchPage）、图表展示页
（ChartsShowcasePage）与 Prometheus 文本格式的 `/metrics` 端点：业务运营数据
与系统可观测性数据彼此割裂，缺少统一的可视化入口。

本特性将现有工作台升级为「统一控制面板」，在一个页面上聚合全部后台数据——
业务运营（作品/章节/读者/作者/收益/评论/审核/阅读行为）与系统可观测性
（HTTP 请求量、Redis 缓存命中率、热 key 模式、慢 SQL、Redis 慢命令），
并按固定分区布局呈现，保留原有快捷操作与待办入口。

## Glossary

- **系统**：B 端管理后台（`apps/admin` + 后端 `backend`）
- **工作台**：B 端默认首页，路由 `/workbench`
- **业务数据**：来自数据库业务表的运营指标（作品、章节、读者、收益等）
- **系统指标**：来自进程内指标存储（`app/core/metrics.py`）的可观测性数据
- **KPI 卡片**：顶部 4 列指标卡，含数值、趋势标注与迷你走势
- **热 key**：缓存键中数字 ID 归一化为 `{id}` 后的模式聚合（高访问量缓存模式）
- **慢 SQL**：执行耗时超过 `slow_query_threshold_ms`（默认 100ms）的查询
- **慢命令**：执行耗时超过 `redis_slow_command_threshold_ms`（默认 20ms）的 Redis 命令

## Requirements

### Requirement 1: 统一控制面板入口

**User Story:** AS 后台管理员，I want 在默认首页看到一个统一控制面板，SO THAT 无需跳转多个页面即可掌握全局。

#### Acceptance Criteria

1. WHEN 系统渲染 `/workbench` 首页，系统 SHALL 展示统一控制面板布局，该布局包含业务 KPI 区、业务图表区、内容概览区与系统可观测性区
2. WHILE 控制面板处于加载状态，系统 SHALL 展示骨架屏占位而非空白
3. IF 任一数据源加载失败，系统 SHALL 展示对应分区的错误占位并提供重试按钮，其余分区 SHALL 保持正常渲染

### Requirement 2: 业务 KPI 卡片

**User Story:** AS 后台管理员，I want 看到关键业务总量，SO THAT 快速判断平台规模与待办压力。

#### Acceptance Criteria

1. WHEN 控制面板加载完成，系统 SHALL 展示 4 张 KPI 卡片：作品总数、待审核数、作者总数、读者总数
2. WHEN KPI 数据存在，系统 SHALL 在每张卡片展示迷你趋势线与趋势标注（如已发布数量）
3. IF 待审核数大于 0，系统 SHALL 以警示色标注该卡片并增加待办计数

### Requirement 3: 业务图表区

**User Story:** AS 后台管理员，I want 在同一面板查看业务走势图，SO THAT 掌握增长趋势与内容结构。

#### Acceptance Criteria

1. WHEN 控制面板加载完成，系统 SHALL 展示字数增长趋势（日增 + 累计双线）
2. WHEN 阅读行为数据存在，系统 SHALL 展示 7×24 阅读热力图
3. WHEN 阅读行为数据存在，系统 SHALL 展示阅读漏斗（曝光→详情→加书架→开始阅读→7日回访）
4. WHEN 点击/收藏数据存在，系统 SHALL 展示作品排行（按点击量 Top 10 柱状图）
5. WHEN 作品数据存在，系统 SHALL 展示分类分布（饼图/环形图）
6. WHEN 用户切换时间范围（7/30/90 天），系统 SHALL 重新请求并刷新趋势类图表

### Requirement 4: 系统可观测性面板（新增）

**User Story:** AS 后台管理员，I want 在同一面板查看系统健康指标，SO THAT 无需访问 Prometheus 即可发现缓存命中率低、慢查询、慢命令等异常。

#### Acceptance Criteria

1. WHEN 系统指标数据存在，系统 SHALL 展示 HTTP 请求量、Redis 缓存命中率、慢 SQL 数、Redis 慢命令数 4 项关键指标
2. WHEN 存在路径级请求数据，系统 SHALL 展示请求量 Top 10 柱状图
3. WHEN 存在缓存模式数据，系统 SHALL 展示热 key 模式命中/未命中对比（横向柱状图）
4. WHEN 存在慢 SQL 明细，系统 SHALL 以列表展示最慢 SQL 的归一化语句与耗时
5. WHEN 存在慢命令明细，系统 SHALL 以列表展示最慢 Redis 命令与耗时
6. IF 某系统指标为 0（如无慢查询），系统 SHALL 展示空态提示而非空白

### Requirement 5: 内容概览与待办

**User Story:** AS 后台管理员，I want 看到内容规模概览并可直达待办，SO THAT 快速进入审核等工作。

#### Acceptance Criteria

1. WHEN 控制面板加载完成，系统 SHALL 展示内容概览（作品总数、章节总数、待审核数、今日打赏、今日评论）
2. WHEN 存在待办事项，系统 SHALL 在欢迎条展示待办计数并可点击跳转至审核工作台

### Requirement 6: 系统指标聚合接口

**User Story:** AS 前端开发者，I want 一个返回结构化系统指标的 JSON 接口，SO THAT 前端无需解析 Prometheus 文本格式。

#### Acceptance Criteria

1. WHEN 管理员请求系统指标聚合接口，系统 SHALL 返回统一响应格式 `{code, message, data}`，`data` 包含 HTTP、Redis、DB 三类指标的完整快照
2. WHEN 指标存储为空（进程刚启动无请求），系统 SHALL 返回全零快照而非报错
3. WHEN 后端非 DEBUG 环境，系统 SHALL 要求管理员鉴权通过后方可访问该接口

### Requirement 7: 图表组件复用

**User Story:** AS 前端开发者，I want 复用现有 `@novel/b-end` 图表组件，SO THAT 保持视觉与实现一致性。

#### Acceptance Criteria

1. WHEN 渲染业务图表，系统 SHALL 复用现有业务图表组件（WordCountGrowthChart、ReadingHeatmap、ReadingFunnel、RankingTrendChart、CategoryDistributionChart）
2. WHEN 渲染系统指标图表，系统 SHALL 复用通用图表组件（BColumnChart、BPieChart、BGauge、BLineChart、BHeatmap）
3. WHILE 图表组件按需加载，系统 SHALL 展示骨架屏占位
