# 智能巡检系统

基于 Playwright 的自动化巡检系统，覆盖后端 API、前端页面、业务链路三大维度。

## 目录结构

```
monitoring/
├── playwright.config.ts    # Playwright 配置
├── run.sh                  # 运行入口脚本
├── README.md               # 本文件
├── checks/
│   ├── health.ts           # 后端健康检查
│   ├── api.b-end.ts        # B 端 API 接口巡检
│   ├── api.c-end.ts        # C 端 API 接口巡检
│   ├── pages.b-end.ts      # B 端页面渲染巡检
│   ├── pages.c-end.ts      # C 端页面渲染巡检
│   └── business-flow.ts    # 核心业务链路巡检
└── reports/                # 报告输出目录
```

## 巡检维度

| 维度 | 覆盖范围 | 检查项数 |
|------|---------|---------|
| 健康检查 | 后端 /health、C/B 端根路径 | 3 |
| B 端 API | 作品/工作台/审核/用户/角色/系统配置/稿费/敏感词/图表 | 11 |
| C 端 API | 书籍/分类/详情/章节/评论/评分/推荐/发现/搜索 | 11 |
| B 端页面 | 登录页/404/控制台错误 | 3 |
| C 端页面 | 首页/登录/书籍详情/分类/搜索/404/控制台错误 | 7 |
| 业务链路 | C 端阅读全流程/B 端管理全流程/搜索分类等 | 6 |

## 使用方法

### 启动服务

```bash
# 后端
cd /workspace/backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# B 端管理后台
cd /workspace/apps/admin && pnpm dev &

# C 端前端
cd /workspace/apps/web && pnpm dev &
```

### 运行巡检

```bash
# 全量巡检
bash monitoring/run.sh

# 指定维度
bash monitoring/run.sh --only health    # 仅健康检查
bash monitoring/run.sh --only api       # 仅 API 巡检
bash monitoring/run.sh --only page      # 仅页面巡检
bash monitoring/run.sh --only flow      # 仅业务链路巡检

# 指定报告格式（默认 json）
bash monitoring/run.sh --report json
```

### 直接使用 Playwright

```bash
npx playwright test --config=monitoring/playwright.config.ts --project=backend
npx playwright test --config=monitoring/playwright.config.ts --project=api-b-end
npx playwright test --config=monitoring/playwright.config.ts --project=api-c-end
npx playwright test --config=monitoring/playwright.config.ts --project=pages-b-end
npx playwright test --config=monitoring/playwright.config.ts --project=pages-c-end
npx playwright test --config=monitoring/playwright.config.ts --project=business-flow
```

## 检查规则

### 健康检查 (health.ts)
- `/health` 端点返回 `{"status":"ok","version":"x.x.x"}`
- C 端和 B 端 API 根路径可访问

### API 巡检 (api.b-end.ts, api.c-end.ts)
- 每个接口返回 HTTP 200
- 响应体中 `code` 字段为 0
- 列表接口返回 `list` 数组

### 页面巡检 (pages.b-end.ts, pages.c-end.ts)
- 页面 HTTP 状态码正常
- 关键 DOM 元素存在
- 控制台无 JS 错误

### 业务链路 (business-flow.ts)
- 跨服务链路完整性
- 数据流一致性
- 页面导航无崩溃