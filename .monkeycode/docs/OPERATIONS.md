# 运行与部署

## 服务拓扑

| 服务 | 开发端口 | 说明 |
|------|----------|------|
| FastAPI 后端 | 8000 | API、健康检查、指标和上传资源 |
| C 端读者站 | 5173 | Vite 开发服务 |
| B 端管理后台 | 5174 | Vite 开发服务 |
| Storybook | 6006 | 组件预览 |
| 自检服务 | 8090 | 真实请求检查任务与运行报告 |

C 端和 B 端的 Vite 配置均将 `/api` 与 `/uploads` 转发至后端 `8000` 端口。

## 开发运行

```bash
bash start.sh
```

脚本以 `DEBUG=true` 启动三项服务。开发模式会建立兼容表结构、按需写入种子数据，并开放 OpenAPI 文档。

## 容器部署

```bash
docker compose up -d --build
```

容器部署要求在项目环境中提供长度至少 32 个字符的 `JWT_SECRET`。当前 Compose 拓扑包含：

- `backend`：FastAPI 服务，SQLite 数据保存在 `atlas-data` 卷，上传文件保存在 `atlas-uploads` 卷。
- `frontend`：Nginx 服务，80 端口提供 C 端，8080 端口提供 B 端。

后端健康检查地址为 `/health`，返回应用状态和版本。

## 脚本部署

| 命令 | 用途 |
|------|------|
| `bash scripts/deploy.sh` | 构建并部署前后端 |
| `bash scripts/deploy.sh --skip-build` | 跳过构建并重启服务 |
| `bash scripts/deploy-test.sh` | 测试环境部署、测试和巡检 |
| `bash scripts/deploy-test.sh --quick` | 快速启动测试环境 |

脚本部署会执行 `alembic upgrade head`。数据库模型变化必须附带可审阅的迁移。

## 观测与自检

| 入口 | 用途 |
|------|------|
| `/health` | 服务健康和版本 |
| `/metrics` | Prometheus 文本指标；生产环境要求 access token |
| `bash selfcheck/run.sh status` | 自检服务状态和最近摘要 |
| `bash selfcheck/run.sh run --tag fast` | 关键链路真实请求自检 |
| `bash selfcheck/run.sh run --tag all` | 全量真实请求自检 |

自检服务启动时会执行健康检查并归档报告。B 端“运行看板”位于 `/operations`，需要 `system.config` 权限；页面仅访问 B 端 API，由后端服务访问本机自检服务。看板支持健康、API、页面、业务流、性能和批量完整检查。

CI 在代码变更时执行质量门禁，并按计划执行健康检查。运行失败使用非零状态传递到调用方；报告作为 CI artifact 保存。

质量检查命令见 [QUALITY.md](./QUALITY.md)。
