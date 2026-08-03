# Tasklist · discover-page-enhancement

> 按依赖顺序排列。B = 后端，F = 前端，T = 测试/巡检。

## T1 · 后端聚合接口（B）

| 编号 | 任务 | 交付物 | 依赖 |
|------|------|--------|------|
| T1-1 | `CacheKeys` 增加 `HOME` 缓存键 | `backend/app/core/redis.py` | - |
| T1-2 | `DiscoveryService` 新增 `get_home_payload()`（聚合 6 模块，单模块失败降级空数组） | `backend/app/services/discovery_service.py` | T1-1 |
| T1-3 | `discovery.py` 新增 `GET /discovery/home` 路由 | `backend/app/api/c_end/discovery.py` | T1-2 |
| T1-4 | 后端测试：`/discovery/home` 返回 6 模块、失败降级、缓存命中 | `backend/tests/test_api_c_end.py` | T1-3 |

## T2 · 前端发现页重构（F）

| 编号 | 任务 | 交付物 | 依赖 |
|------|------|--------|------|
| T2-1 | types.ts 新增 `DiscoverHome`、`BookSummary.freeDeadline?` | `apps/web/src/api/types.ts` | - |
| T2-2 | fetcher 新增 `getDiscoverHome()` | `apps/web/src/api/fetcher.ts` | T2-1 |
| T2-3 | 新增 `ErrorState` 组件（或复用 EmptyState action） | `apps/web/src/components/ErrorState.tsx` (+css) | - |
| T2-4 | 新增 `DiscoverModule` 模块级容错包装组件 | `apps/web/src/components/DiscoverModule.tsx` | T2-3 |
| T2-5 | DiscoverPage 切换为聚合接口 + 整页错误态/重试 + 模块级容错 | `apps/web/src/pages/DiscoverPage.tsx` | T2-2, T2-4 |
| T2-6 | 排行榜改用聚合预取数据，Tab 切换本地切换 | `apps/web/src/pages/DiscoverPage.tsx` | T2-5 |
| T2-7 | 限免倒计时：`freeDeadline` 存在则倒计时，否则降级「限免中」 | `apps/web/src/pages/DiscoverPage.tsx` | T2-1 |

## T3 · 搜索页分页加载（F）

| 编号 | 任务 | 交付物 | 依赖 |
|------|------|--------|------|
| T3-1 | 搜索结果分页累积 + 「加载更多」 | `apps/web/src/pages/SearchPage.tsx` | - |
| T3-2 | 「已加载全部」提示 + 加载更多失败重试 | `apps/web/src/pages/SearchPage.tsx` | T3-1 |

## T4 · 分类页补强（F）

| 编号 | 任务 | 交付物 | 依赖 |
|------|------|--------|------|
| T4-1 | 分类树支持二级分类展示 | `apps/web/src/pages/CategoryPage.tsx` | - |
| T4-2 | 列表加载失败错误态 + 重试 | `apps/web/src/pages/CategoryPage.tsx` | - |
| T4-3 | 确认 tag 过滤走后端参数、无客户端二次过滤 | `apps/web/src/pages/CategoryPage.tsx`（验证） | - |

## T5 · 巡检与验证（T）

| 编号 | 任务 | 交付物 | 依赖 |
|------|------|--------|------|
| T5-1 | 发现页巡检断言更新（聚合加载、错误重试、限免、分类二级） | `monitoring/checks/pages.c-end.ts` | T2 |
| T5-2 | 搜索/分类巡检断言更新 | `monitoring/checks/pages.c-end.ts`、`business-flow.ts` | T3, T4 |
| T5-3 | `pnpm typecheck` + `pnpm run ci` + 后端 pytest 全量通过 | CI | 全部 |
| T5-4 | `bash monitoring/run.sh` 41 项巡检通过 | 巡检结果 | T5-1, T5-2 |

## 里程碑

- M1（T1 + T2）：发现页聚合重构完成，首屏 5 请求 → 1 请求
- M2（T3 + T4）：搜索分页与分类二级分类完成
- M3（T5）：全量验证通过
