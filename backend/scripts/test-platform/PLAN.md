# 测试平台专项精细控制 + 真实流量自检服务 — 实施记录

> 目标：加速 pytest 冷启动、降低运行资源消耗，提供分层精细控制，
> 并落地一个可常驻、可按需触发的真实流量请求自检服务。

## 实施状态：✅ 已完成（2026-08-09）

| 步骤 | 内容 | 状态 |
|------|------|------|
| 1 | conftest 共享库 + 一次建表 + 清表 | ✅ 全量 479 通过，24.1s |
| 2 | markers + run.py runner + package.json | ✅ unit 6.5s / api 9s / quick 23s |
| 3 | selfcheck 服务 + runner + run.sh | ✅ 133 项自检 0 失败 |
| 4 | deploy 脚本集成 + 文档更新 | ✅ AGENTS.md / PLAN.md / deploy.sh |

### 实测优化收益

- 全量单进程：41.53s → **24.1s**（-42%），内存峰值 192MB
- 冷启动根因消除：479 次 create_all/drop_all → 1 次建表 + 479 次空表 DELETE
- 2 核机器默认单进程（-n 0），xdist 并行在 2 核上开销 > 收益（26.6s vs 24.1s）
- 自检服务发现并修复真实 bug：`ensure_schema_compat` 通用化，
  自动补齐 `audit_histories.operator_ip/user_agent` 等旧库缺失列（原 500 错误）
- runner 增强：`--fail-fast` / `--watch` / `--report-dir` 模式

---

## 一、问题诊断（基于实测）

| 现象 | 根因 |
|------|------|
| 冷启动慢，全量 41s（479 tests） | 每个测试独立 `create_all` + `drop_all`（SQLite `:memory:` 每个连接独立库，表结构无法复用） |
| `-n auto` 在 2 核机器起 2 个 worker | 每个 worker 独立进程：独立内存库 + 完整 import `app.main`（FastAPI 全模块），内存双份（当前已用 6.8/7.8G） |
| 无法按需选取测试范围 | 无分层体系，只有 `slow`/`benchmark` 两个标记，其余全量 |
| 自检能力为一次性脚本 | `scripts/global-check`（127 项）与 `monitoring`（41 项）都是"跑完即走"，缺少常驻自检服务 |

关键实测数据：
- 收集耗时 0.37s，最慢单个 setup 0.20s → 瓶颈在 479 次建表/删表，而非单个测试
- 21 处测试直接 `commit()`，服务层内部也大量 commit → 共享库必须"每测试前清表"而非依赖回滚

---

## 二、总体架构

```
backend/
├── conftest.py                     # [模块1] 共享内存库 + 一次建表 + 每测试前清表
├── tests/                          # 按文件命名分层（无需逐测改造）
├── scripts/
│   └── test-platform/
│       ├── run.py                  # [模块2] 精细控制 runner
│       ├── layers.py               # 分层规则定义（unit/service/api/security）
│       └── PLAN.md                 # 本文档
└── selfcheck/                      # [模块3] 真实流量自检服务
    ├── service.py                  # 常驻 FastAPI（端口 8090）
    ├── runner.py                   # 复用 GlobalChecker 的探测执行器
    └── run.sh                      # start / stop / status / run 管理
```

---

## 三、模块 1：pytest 冷启动加速（conftest.py 重构）

### 3.1 共享内存库 + 一次建表

```python
from sqlalchemy.pool import StaticPool
_test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    poolclass=StaticPool,            # 所有 session 复用同一个内存连接
    connect_args={"check_same_thread": False},
)
```

- session-scope fixture `create_schema`：全局只执行一次 `create_all`
- `setup_db` 依赖 `create_schema`，改为**每测试前清表**，不再 drop_all：

```python
_ALL_TABLES = sorted(Base.metadata.tables)  # 27 张表

async def _truncate_all(session):
    for name in _ALL_TABLES:
        await session.execute(text(f'DELETE FROM "{name}"'))
```

- SQLite 未启用 `AUTOINCREMENT` 关键字时，DELETE 全表后 `rowid` 从 1 重置，
  自增行为与 drop_all+create_all 一致（已验证 `IdMixin` 为普通自增主键）
- `client` fixture 同步改造：只建表一次，依赖 `create_schema`
- `test_production_security.py` 使用独立 `:memory:` 引擎 + 自建表，不受影响

### 3.2 预期收益

- 建表/删表 479 次 → 1 次建表 + 479 次空表 DELETE（SQLite 空表 DELETE 为 µs 级）
- 单进程模式即可显著提速；并行模式内存占用下降（不再每 worker 独立建库表）

### 3.3 风险与回滚

- 数据隔离依赖"每测试前清表"，需确认所有测试不依赖跨测试残留数据（当前 479 全绿，重构后立即全量验证）
- 若个别测试依赖自增不复位，可在该测试改用显式 id 或单独标记

---

## 四、模块 2：测试平台精细控制

### 4.1 分层规则（按文件命名，零改造成本）

| 层 | 匹配规则 | 典型文件 |
|----|---------|---------|
| `unit` | 无 DB 依赖的逻辑测试 | test_imports, test_cache_utils, test_sensitive_trie, test_state_machine, test_batch_utils, test_rum |
| `service` | `test_*_service.py` | 16 个服务测试文件 |
| `api` | `test_api_*.py` | test_api_b_end, test_api_c_end |
| `security` | test_production_security.py | — |
| `benchmark` | test_benchmarks.py（默认禁） | — |

### 4.2 pytest 标记增强

- pytest.ini 注册 `unit/service/api/security` markers
- 对上述 6 个 unit 文件批量补 `@pytest.mark.unit`，其余层用 `-k` 表达式实现，减少改动面

### 4.3 runner（scripts/test-platform/run.py）

```
python3 scripts/test-platform/run.py [选项]

范围控制:
  --layer unit|service|api|security  按层运行（可逗号组合）
  --quick                            排除 slow+benchmark（秒级回归）
  --full                             全量（等同现在）
  --only-slow                        仅 slow

并行与资源:
  --jobs 0                           单进程（默认，低资源友好）
  --jobs N                           指定 worker 数
  --jobs auto                        按 CPU 减半自适应（2 核→1）
  --no-xdist                         完全禁用 xdist

输出:
  --coverage                         pytest-cov 报告
  --profile                          输出 --durations=15
  --report path                      生成 JSON 汇总（时长/通过/层分布）
```

- 并行度默认策略：2 核机器默认单进程或 `--jobs 1`，显式传入才并行，规避内存翻倍
- 提供 `--dry-run` 展示将运行的测试清单（收集后不执行）

### 4.4 root package.json 命令

```json
"test:unit":       "cd backend && python3 scripts/test-platform/run.py --layer unit",
"test:service":    "cd backend && python3 scripts/test-platform/run.py --layer service",
"test:api":        "cd backend && python3 scripts/test-platform/run.py --layer api",
"test:quick":      "cd backend && python3 scripts/test-platform/run.py --quick",
"test:jobs":       "cd backend && python3 scripts/test-platform/run.py --jobs $N"
```

---

## 五、模块 3：真实流量自检服务（必不可少）

> 将 global-check 的 127 项真实 HTTP 探测 + monitoring 关键项，服务化并常驻。

### 5.1 服务端点（backend/selfcheck/service.py，端口 8090）

| 端点 | 用途 |
|------|------|
| `GET /healthz` | 存活探针（进程级，恒 200） |
| `GET /readyz` | 就绪探针：后端 `/health`、C/B 端首页、DB、Redis 依赖探测 |
| `POST /selfcheck/run` | 后台触发全量自检，body 支持 `{tag, targets, timeout_ms}`，返回 job_id |
| `GET /selfcheck/status/{job_id}` | 查询运行状态（pending/running/done/failed） |
| `GET /selfcheck/latest` | 最近一次自检完整报告（JSON） |
| `GET /selfcheck/summary` | 自检通过率/耗时/失败项摘要 |

### 5.2 执行器（selfcheck/runner.py）

- 复用 `scripts/global-check/global_check.py::GlobalChecker`（真实 HTTP，非 ASGI in-memory）
- tag 分层：`api`（全端点）/ `pages`（C/B 端页面）/ `health`（依赖探测）/ `all`
- fast mode：仅关键端点（`/health`、首页、鉴权链路），用于高频巡检
- 并发探测、单请求超时、失败重试（1 次）、报告归档到 `selfcheck/reports/`

### 5.3 运维（selfcheck/run.sh）

```
bash backend/selfcheck/run.sh start          # 常驻启动（后台）
bash backend/selfcheck/run.sh stop           # 停止
bash backend/selfcheck/run.sh status         # 存活 + 最近自检摘要
bash backend/selfcheck/run.sh run --tag api  # 一次性触发并等待结果
```

### 5.4 集成

- `scripts/deploy-test.sh` 增加可选 `--selfcheck`：部署后启动自检服务并跑一次全量
- `scripts/deploy.sh` 增加可选 `--selfcheck`：生产环境挂载常驻自检
- root package.json：`selfcheck:start/stop/status/run`

---

## 六、实施顺序与验收标准

| 步骤 | 内容 | 验收 |
|------|------|------|
| 1 | conftest 共享库 + 一次建表 + 清表 | `pytest -n 0` 全量 479 通过；记录冷启动/全量时长对比 |
| 2 | markers + run.py + package.json | 分层命令可独立运行且通过 |
| 3 | selfcheck 服务 + runner + run.sh | `curl /healthz`、`/readyz`、`POST /selfcheck/run` 全链路可用 |
| 4 | deploy 脚本集成 + 文档更新 | deploy-test --selfcheck 一键通过 |

### 验收指标

- 单进程全量耗时：41s → 目标 ≤ 20s
- 2 核并行内存峰值：当前双 worker 双库 → 目标共享库单内存实例
- `--quick`（unit+service 非 slow）目标 ≤ 15s，适合开发循环
- 自检服务：真实 HTTP 请求覆盖 ≥ 127 项，`/readyz` 探测 ≤ 2s

### 风险清单

1. 共享库数据隔离 → 每测试前清表兜底，全量回归验证
2. 自检服务与 app 端口冲突 → 固定 8090，deploy 脚本检测占用
3. `test_production_security` 独立引擎 → 不动，单独验证
4. xdist 并行 + StaticPool → 每 worker 进程独立 StaticPool，无跨进程共享
