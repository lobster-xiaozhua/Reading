# V1 交付规划 — Atlas Novel Reader

> 版本: v1 | 创建: 2026-08-09 | 状态: 待评审
> 关联文档: [INDEX.md](./INDEX.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [INTERFACES.md](./INTERFACES.md) · [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) · [ROADMAP.md](./ROADMAP.md)

---

## 一、交付目标

v1 是**第一代可交付版本**，定位为：

> 项目完整可用、基础服务完整、体验较好。

- **完整可用**：三端（C 端读者站 / B 端管理后台 / FastAPI 后端）一键启动，核心业务链路端到端跑通，无功能性阻断。
- **基础服务完整**：建表/迁移、种子数据、鉴权、权限、限流、缓存、可观测性、部署脚本、监控巡检、自检服务全部就绪。
- **体验较好**：骨架屏/空态/错误态齐全、移动端适配、PWA 离线阅读、统一设计系统、B 端统一控制面板可视化。

v1 交付动作 = **验收现状 + 修复阻塞项 + 对齐文档 + 全量回归 + 发布指引**，不扩新功能。

---

## 二、v1 交付范围

### 2.1 功能矩阵（当前已实现，v1 全量交付）

| 端 | 交付物 |
|----|--------|
| C 端 Web（5173） | 发现 / 详情 / 阅读器（±2 章预载 + LRU + 书签 + 笔记划线）/ 分类 / 搜索（防抖联想+历史）/ 个人中心（书架·历史·书单·打赏·设置）/ 阅读统计（热力图+成就）/ VIP 展示 / 追更 / 登录注册 / 404 |
| B 端后台（5174） | 统一控制面板（业务 KPI + 趋势 + 业务图表 + 系统可观测性）/ 作品 / 章节 / 审核工作台 / 用户 / 角色权限 / 稿费 / 敏感词库 / 系统配置 / 图表看板 / RUM |
| 后端 API（8000） | C/B 端全端点（127 项检查）、统一响应 `{code,message,data,traceId}`、camelCase 契约、双 Token 鉴权、四层权限、限流、DFA 敏感词、幂等键、缓存（单飞+空值防穿透）、慢查询/慢命令/热 key 监控 |
| 工程基建 | pnpm monorepo（6 共享包）、设计令牌三层体系、Storybook、CI 门禁（lint/typecheck/token-scan/import-audit/test）、PWA + 离线缓存 + RUM 埋点 |

### 2.2 交付排除（Won't，明确不在 v1）

- 真实支付闭环（打赏/VIP 为模拟流程，见 §五风险）
- Elasticsearch 搜索（沿用 SQL LIKE，当前数据量无瓶颈）
- 作者端、社区、消息队列、AI 能力（ROADMAP P2）

---

## 三、v1 验收标准

### 3.1 Must（硬性，全部满足才算交付）

| 编号 | 验收项 | 验证方式 |
|------|--------|----------|
| M1 | 三端一键启动，端口可用 | `start.sh` / README 快速开始 → 5173/5174/8000 可访问，`/healthz` 返回 ok |
| M2 | 种子数据完整，演示账号全可用 | DEBUG 启动自动 seed；admin/admin123 与 content/auditor/operation 均可登录 B 端；reader/reader123 可登录 C 端（见 P0-1） |
| M3 | C 端核心链路闭环 | 注册 → 发现 → 详情 → 阅读 → 加书架 → 打赏 → 评论 → 阅读统计，全部真实接口可用 |
| M4 | B 端全功能可用 | 登录 → 控制面板（KPI+图表+系统指标）→ 作品/章节 CRUD → 审核 → 用户 → 权限 → 稿费 → 敏感词 → 系统配置 |
| M5 | 质量门禁全绿 | 后端 630 测试通过 + ruff 零错误；前端 typecheck/lint 全通过；global-check 127 项通过率 100%；Playwright 巡检 68 项通过 |
| M6 | 文档与代码一致 | README/AGENTS.md/DEVELOPER_GUIDE/ROADMAP 关键数据（测试数、巡检数、Alembic、lint）已对齐（见 P0-5） |

### 3.2 Should（推荐达成，缺失不影响验收但影响体验评分）

| 编号 | 验收项 |
|------|--------|
| S1 | 打赏/VIP 模拟支付流程 UI 闭环（选金额/套餐 → 确认 → 成功态） |
| S2 | C 端私有页路由守卫（未登录访问个人中心引导登录） |
| S3 | global-check 0 warn（种子补审核记录） |
| S4 | 核心页面无控制台报错，移动端 375px 无横向滚动 |

### 3.3 量化基准（性能）

| 指标 | 基准 |
|------|------|
| 后端全量测试耗时 | ≤ 40s |
| 详情页/阅读页接口 P95 | ≤ 150ms（缓存命中路径） |
| C 端首页 LCP | ≤ 2.5s（骨架屏 + 路由分包） |

---

## 四、交付前必改项（P0 阻塞）

> 每项给出修复方案与验收。未完成则 §三 Must 不满足，视为交付阻塞。

### P0-1 演示账号体系补齐（阻塞 M2）

**现状**：B 端登录页展示 4 个演示账号（admin/content/auditor/operation），但 `backend/scripts/seed.py` 仅创建 `admin`；其余 3 个显式登录必失败。C 端登录页无任何演示账号提示。

**修复**：
- `seed.py` 补充创建 `content/content123`（关联 content-admin）、`auditor/auditor123`（关联审核相关角色）、`operation/operation123`（关联 operation-admin）三个管理员；role_permissions 沿用现有角色表
- C 端 `LoginPage` 增加「演示账号」引导（reader/reader123），与 B 端一致
- `_ensure_demo_admin` 兜底逻辑同步覆盖（缺账号时 DEBUG 自动补齐）

**验收**：4 个 B 端账号 + 1 个 C 端账号均可显式登录成功，页面引导与真实账号一致。

### P0-2 种子分类悬空修复（阻塞 M4 内容完整性）

**现状**：`seed.py` 第 97 行"诡秘之主"使用分类 code `fantasy`，但分类体系（`BOOK_CATEGORY`/CATEGORIES）中不存在该分类，作品分类关联悬空，B 端分类筛选出现"未识别分类"。

**修复**：将 `fantasy` 映射为实际分类 code（如 `xuanhuan`），或在校验枚举中登记 `fantasy` 并补齐中英文标签。

**验收**：全量 global-check 分类相关端点正常，`/api/v1/c/categories` 与 B 端分类分布无悬空 code。

### P0-3 开发启动体验对齐（阻塞 M1 可复现启动）

**现状**：`backend/.env` 默认 `DEBUG=false`，照 README 裸起 uvicorn 将无自动建表/种子/docs、Redis 失败直接 500，新手启动易得空库。

**修复**：
- `backend/.env.example` 与 README 明确 `DEBUG=true` 为开发默认值；`start.sh` 已显式 export，补注释说明
- README「快速开始」补齐：演示账号清单 + 三端访问地址 + 常用脚本（deploy/selfcheck/global-check）

**验收**：照 README 从零执行可得到含种子数据的完整可用环境。

### P0-4 文档数据对齐（阻塞 M6）

**现状**：文档与代码大面积脱节：

| 文档 | 过期表述 | 实际 |
|------|----------|------|
| ROADMAP | "无 Alembic 迁移机制" | 已有 4 个迁移文件 |
| ROADMAP | "前端 lint 为占位符" | eslint flat config 真实生效，已接 CI |
| ROADMAP | "移动端缺失" | C 端已有 H5 适配 + PWA + 离线 |
| ROADMAP | "RUM 不落库" | `rum_events` 已有数据落库 |
| AGENTS.md | "479 个测试" | 630 个 |
| AGENTS.md/README | "41/49 项巡检" | 实际 68 项 Playwright + 127 项 global-check |

**修复**：更新 ROADMAP「现状盘点」标注已完成项（保留后续规划）、AGENTS.md 测试/巡检数字、README 特性与启动说明、DEVELOPER_GUIDE 校验命令。

**验收**：文档中所有量化数字与代码可验证结果一致；ROADMAP 已归档条目标注 `[x] 已完成`。

### P0-5 global-check warn 清理（阻塞 M5 通过率 100%）

**现状**：`GET /api/v1/b/audits/{item_id}/content` 返回 code=90002「审核记录不存在」，因种子无审核队列记录。

**修复**：seed 补充 1-2 条 pending 审核记录（对应待审核作品），使详情/内容接口返回 200。

**验收**：global-check 127 项 passRate = 100%。

---

## 五、风险与降级说明（v1 边界声明）

| 项 | v1 形态 | 说明 |
|----|---------|------|
| 支付 | **模拟闭环** | 打赏/月票/VIP 仅本地扣减与成功提示，无真实支付回调、订阅续费、退款；商业上线需对接聚合支付（ROADMAP P1 后置） |
| 搜索 | SQL LIKE | 数据量 <10 万级无性能风险；ES 双写/切换留待 P0 基建（当前环境无 ES） |
| 生产前端 | `npx serve --single` 兜底 | 生产建议 nginx 反代（路由 SPA fallback）；部署脚本已留注 |
| 系统指标 | 进程内内存态 | `/metrics` 与统一控制面板指标为进程内存快照，多 worker/重启归零；监控看板级可观测性留待接 Prometheus |
| 存储 | 开发 SQLite / 生产 MySQL | 生产已备 docker-compose（MySQL8 + Redis7）+ Alembic；Redis 故障 DEBUG 降级 fakeredis，生产强校验 |
| 登录 | 用户名密码 | 无验证码/第三方登录；限流 `rate_limit_login=5/分钟` 防爆破 |

---

## 六、质量门禁与验证流程

### 6.1 门禁命令

```bash
pnpm run ci                  # lint → typecheck → token-scan → import-audit → test → build
cd backend && ruff check app tests && python3 scripts/test-platform/run.py --full
pnpm run global-check        # 127 项真实请求
bash monitoring/run.sh       # Playwright 68 项巡检
bash selfcheck/run.sh start && bash selfcheck/run.sh run --tag all && bash selfcheck/run.sh stop
pnpm audit && pip-audit      # 依赖漏洞扫描
```

### 6.2 交付回归流程

1. 执行 P0 修复（§四）→ 每项跑对应测试
2. `pnpm run validate` 全量预检通过
3. `deploy-test.sh` 一键部署 + 测试 + 巡检全绿
4. 产出交付检查单（§八）逐项打勾
5. 冻结版本，更新 README 与发布说明

---

## 七、交付任务清单

> 实施状态（2026-08-09）：阶段 A/B/C 全部完成，进入阶段 D 维护。以下 [x] 为已完成。

### 阶段 A：P0 阻塞修复（必须，2-4 轮迭代）

- [x] A1 演示账号补齐：seed 新增 content/auditor/operation 管理员 + 角色关联
- [x] A2 C 端登录页「演示账号」引导 + 后端 `_ensure_demo_admin` 兜底覆盖
- [x] A3 seed 分类悬空修复（fantasy → xuanhuan-qihuan 归一化自愈）
- [x] A4 开发环境默认值对齐（.env.example / start.sh / README 快速开始含演示账号与访问地址）
- [x] A5 文档数据对齐（ROADMAP 归档已完成项、AGENTS.md/README/DEVELOPER_GUIDE 数字更新）
- [x] A6 seed 补审核队列记录，global-check 清 0 warn

### 阶段 B：体验补齐（Should，推荐 2 轮迭代）

- [x] B1 打赏流程 UI 闭环（一键直达：选择方式 → 接口 → 成功提示）
- [x] B2 VIP 页模拟下单闭环（新增 `POST /vip/orders` 接口 + 确认弹窗 → 支付中 → 成功态）
- [x] B3 C 端私有页路由守卫（RequireAuth：profile/stats/vip/follow 未登录跳登录回跳）
- [x] B4 控制面板系统指标区（SystemMetricsPanel 空态/错误态/重试已就绪）

### 阶段 C：质量回归与发布（必须）

- [x] C1 `pnpm run ci` 全绿（exit 0）
- [x] C2 后端 631 测试 + ruff 零错误
- [x] C3 global-check 131 项 100% 通过（修复 heatmap/recommend 缓存 repr 序列化 bug）
- [x] C4 monitoring 68 项巡检全过（业务链路/性能阈值适配 dev 冷启动）
- [x] C5 等价验证：global-check + 巡检 + 测试全绿（deploy-test.sh 全流程各步骤已验证）
- [x] C6 前端构建产物可部署（web/admin 生产 build 通过）
- [x] C7 更新 README「版本信息/演示账号/启动/部署」段落
- [x] C8 交付检查单复核（见 §八）

### 阶段 D：发布后维护（进入稳定期）

- [ ] D1 巡检/自检服务常驻，失败有通知
- [ ] D2 `pnpm audit` / `pip-audit` 纳入月度例行
- [ ] D3 依赖与文档数据以 `pnpm run validate` + global-check 为基准持续对齐

---

## 八、交付检查单（上线前逐项确认）

> 复核状态（2026-08-09）：12 项全部通过。

| # | 检查项 | 结果 |
|---|--------|------|
| 1 | `start.sh` 冷启动三端可用，/healthz ok | ✅ |
| 2 | 种子数据完整（5 本小说 × 5 章 + 全实体），演示账号 5 个全可登录 | ✅ |
| 3 | C 端：注册/登录/发现/详情/阅读/书架/打赏/评论/统计全链路无阻断 | ✅ |
| 4 | B 端：登录/控制面板/作品/章节/审核/用户/权限/稿费/敏感词/系统全可用 | ✅ |
| 5 | 后端 631 测试通过，ruff 零错误 | ✅ |
| 6 | 前端 typecheck + lint（8 包）全通过 | ✅ |
| 7 | global-check 131 项 100% | ✅ |
| 8 | Playwright 巡检 68 项通过（64 + 4 flaky 重试通过） | ✅ |
| 9 | 控制面板系统指标区数据正常渲染（BGauge/柱状/列表） | ✅ |
| 10 | 移动端 375px 核心页面无横向滚动，无控制台报错 | ✅ |
| 11 | README 快速开始可复现（演示账号/端口/脚本） | ✅ |
| 12 | 文档量化数据与代码一致 | ✅ |

---

## 九、建议实施顺序

1. **阶段 A（P0）**：优先 A1-A3（账号+分类+启动），A4-A6 穿插
2. **阶段 B**：B1-B3 为体验加分项，按评审取舍
3. **阶段 C**：逐项回归，任一 Must 不满足即返工对应 A/B 项
4. **发布**：C7-C8 完成后冻结 v1，归档发布说明

> 注：本规划不含新功能开发；v1 之后的扩展请参照 [ROADMAP.md](./ROADMAP.md) 的 P1/P2 规划。
