# 质量门禁

## 日常验证

| 目标 | 命令 |
|------|------|
| 快速预检 | `pnpm run validate:quick` |
| 完整预检 | `pnpm run validate` |
| 前端 lint | `pnpm run lint` |
| TypeScript 类型检查 | `pnpm run typecheck` |
| 后端静态检查 | `cd backend && ruff check app/` |
| 后端快速回归 | `cd backend && python3 scripts/test-platform/run.py --quick` |
| 后端完整回归 | `cd backend && python3 scripts/test-platform/run.py --full` |

`pnpm run ci` 执行仓库定义的 CI 流程。构建和测试规模由源码和当前执行结果决定，避免依赖文档中的固定数量。后端 runner 使用测试文件命名规则生成 `unit`、`service`、`api`、`security` 和 `benchmark` 分层，显式 `--jobs 0` 保证单进程运行。

## 真实请求验证

| 目标 | 命令 |
|------|------|
| OpenAPI 端点与页面检查 | `pnpm run global-check` |
| 仅 API | `pnpm run global-check:api` |
| 仅页面 | `pnpm run global-check:pages` |
| Playwright 全量巡检 | `pnpm run monitor` |
| 健康检查 | `pnpm run monitor:health` |
| 业务流 | `pnpm run monitor:flow` |
| 性能巡检 | `pnpm run monitor:perf` |

巡检配置和覆盖边界见 [模块/监控巡检.md](./模块/监控巡检.md)。

## 安全与依赖

| 目标 | 命令 |
|------|------|
| 设计令牌和代码约束 | `pnpm run token-scan` |
| B 端导入边界 | `pnpm run import-audit` |
| 前端依赖审计 | `pnpm audit` |
| Python 依赖审计 | `cd backend && pip-audit` |

## 提交前基线

1. 修改代码后执行受影响模块的测试和静态检查。
2. 跨端、接口或共享包改动执行 `pnpm run validate:quick`。
3. 发布前执行 `pnpm run validate`、`pnpm run global-check` 和 `pnpm run monitor`；任一步失败均应阻断发布。
4. 涉及数据结构的改动额外验证 Alembic 迁移和数据兼容性。
