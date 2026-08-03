# 接口文档

## API 设计规范

### 基础信息

- **基础 URL**: `/api/v1`（统一前缀）
- **C 端**: `/api/v1/c/*` — 读者端接口
- **B 端**: `/api/v1/b/*` — 管理后台接口
- **健康检查**: `/health`

### 统一响应格式

所有接口返回统一 JSON 结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "traceId": "a1b2c3d4e5f6"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | int | 0 成功，非零业务错误 |
| `message` | string | 成功为 "ok"，失败为错误描述 |
| `data` | T | 响应数据（可能为 null） |
| `traceId` | string | 链路追踪 ID |

### 分页格式

```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "hasMore": true
}
```

### 命名规范

- Python 后端使用 `snake_case`，通过 `CamelModel` 基类自动序列化为 `camelCase`
- 前端 TypeScript 直接使用 `camelCase`

### 鉴权方式

- **Header**: `Authorization: Bearer <access_token>`
- 无 Token 时自动降级为 demo 用户（开发模式）
- 详见 [专有概念/双Token鉴权.md](./专有概念/双Token鉴权.md)

---

## C 端 API（读者端）

### 鉴权 `/api/v1/c/auth`

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| POST | `/auth/register` | 读者注册 | username, password, nickname |
| POST | `/auth/login` | 读者登录 | username, password |
| GET | `/auth/me` | 当前用户信息 | - |

### 发现页 `/api/v1/c`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/discovery/home` | 发现页聚合（Banner + 热门 + 分类 + 推荐） |
| GET | `/banners` | 轮播 Banner 列表 |
| GET | `/books/hot` | 本周热门 |
| GET | `/books/free-limited` | 限时免费 |
| GET | `/books/editor-picks` | 编辑推荐 |
| GET | `/rankings/{rank_type}` | 排行榜（人气/收藏/月票/新书） |
| GET | `/categories` | 分类树 |
| GET | `/tags` | 标签列表 |
| GET | `/recommendations` | 个性推荐 |
| GET | `/topics` | 话题列表 |
| GET | `/book-lists` | 书单列表 |
| GET | `/reviews` | 精选书评 |

### 书籍 `/api/v1/c`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/books` | 书籍列表（支持分类/标签/排序筛选） |
| GET | `/books/{book_id}` | 书籍详情 |
| GET | `/books/{book_id}/chapters` | 章节列表 |
| GET | `/books/{book_id}/chapters/{chapter_id}` | 章节内容 |
| GET | `/books/{book_id}/related` | 相关推荐 |
| GET | `/books/{book_id}/comments` | 评论列表 |
| GET | `/books/{book_id}/rating-distribution` | 评分分布 |

### 搜索 `/api/v1/c`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/search/suggestions` | 搜索建议（自动补全） |
| GET | `/search/books` | 搜索书籍 |
| GET | `/search/hot` | 热搜词 |

### 用户中心 `/api/v1/c`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/me` | 个人信息 |
| GET | `/me/bookshelf` | 书架列表 |
| GET | `/me/reading-history` | 阅读历史 |
| GET | `/me/rewards` | 打赏记录 |
| GET | `/me/stats/overview` | 阅读统计概览 |
| GET | `/me/stats/heatmap` | 阅读热力图 |
| GET | `/me/badges` | 成就徽章 |
| GET | `/me/follows` | 关注列表 |
| POST | `/me/follows/read-all` | 标记全部已读 |
| GET | `/vip/plans` | VIP 套餐列表 |
| GET | `/payment/methods` | 支付方式 |

### 互动操作 `/api/v1/c`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/me/bookshelf/{novel_id}` | 加入书架 |
| DELETE | `/me/bookshelf/{novel_id}` | 移出书架 |
| POST | `/me/reading-progress` | 上报阅读进度 |
| POST | `/books/{book_id}/comments` | 发表评论 |
| POST | `/comments/{comment_id}/like` | 点赞评论 |
| POST | `/books/{book_id}/rewards` | 打赏 |
| POST | `/books/{book_id}/rating` | 评分 |

### 笔记 `/api/v1/c/me/notes`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/me/notes` | 创建笔记 |
| GET | `/me/notes` | 笔记列表 |
| PUT | `/me/notes/{note_id}` | 更新笔记 |
| DELETE | `/me/notes/{note_id}` | 删除笔记 |

---

## B 端 API（管理后台）

### 鉴权 `/api/v1/b/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 管理员登录 |
| POST | `/auth/refresh` | 刷新 Token |
| POST | `/auth/logout` | 登出 |
| GET | `/auth/me` | 当前管理员信息 |

### 工作台 `/api/v1/b/workbench`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/workbench/kpi` | KPI 卡片数据 |
| GET | `/workbench/overviews` | 概览数据 |
| GET | `/workbench/word-trend` | 字数趋势 |

### 作品管理 `/api/v1/b/novels`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/novels` | 作品列表（支持筛选/排序/搜索） |
| GET | `/novels/{novel_id}` | 作品详情 |
| POST | `/novels` | 新建作品 |
| PUT | `/novels/{novel_id}` | 编辑作品 |
| POST | `/novels/batch-operate` | 批量操作 |
| POST | `/novels/submit-audit` | 提交审核 |
| POST | `/novels/approve` | 审核通过 |
| POST | `/novels/shelve` | 上架 |
| POST | `/novels/reshelve` | 重新上架 |
| GET | `/novels/{novel_id}/stats` | 作品统计 |
| GET | `/novels/{novel_id}/audit-history` | 审核历史 |
| GET | `/novels/{novel_id}/comments` | 作品评论 |

### 章节管理 `/api/v1/b`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/novels/{novel_id}/chapters` | 章节列表 |
| GET | `/chapters/{chapter_id}` | 章节详情 |
| POST | `/chapters` | 创建章节 |
| PATCH | `/chapters/{chapter_id}` | 编辑章节 |
| POST | `/novels/{novel_id}/chapters/reorder` | 章节排序 |
| POST | `/chapters/{chapter_id}/transition` | 章节状态流转 |
| POST | `/chapters/batch-operate` | 章节批量操作 |
| DELETE | `/chapters/{chapter_id}` | 删除章节 |

### 审核 `/api/v1/b/audits`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/audits/queue` | 审核队列 |
| GET | `/audits/{item_id}/history` | 审核历史 |
| POST | `/audits/submit` | 提交审核结果（通过/驳回） |

### 角色权限 `/api/v1/b`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/roles` | 角色列表 |
| GET | `/roles/{role_key}` | 角色详情 |
| PUT | `/roles/{role_key}/permissions` | 更新角色权限 |
| PATCH | `/roles/{role_key}` | 更新角色元信息 |
| GET | `/permissions` | 权限点列表 |

### 稿费 `/api/v1/b/royalties`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/royalties` | 稿费明细列表 |
| POST | `/royalties/batch-settle` | 批量结算 |
| POST | `/royalties/mark-withdrawn` | 标记已提现 |

### 敏感词 `/api/v1/b/sensitive-words`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/sensitive-words` | 敏感词库 |
| POST | `/sensitive-words` | 添加敏感词 |
| POST | `/sensitive-words/check` | 文本敏感词扫描 |
| DELETE | `/sensitive-words` | 删除敏感词 |

### 图表 `/api/v1/b/charts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/charts/workbench-trend` | 工作台趋势 |
| GET | `/charts/word-count-growth` | 字数增长趋势 |
| GET | `/charts/reading-heatmap` | 阅读热力图 |
| GET | `/charts/reading-funnel` | 阅读转化漏斗 |
| GET | `/charts/ranking-trend` | 排行趋势 |
| GET | `/charts/category-distribution` | 分类分布 |
| GET | `/charts/basic` | 基础图表 |

### 系统配置 `/api/v1/b/system`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/system/config` | 获取系统配置 |
| PUT | `/system/config` | 更新系统配置 |

### 用户管理 `/api/v1/b/users`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users` | 读者列表 |

---

## 前端 API 层

### HTTP 客户端 (`http.ts`)

- 统一前缀: `/api/v1/c`（C 端）/ `/api/v1/b`（B 端）
- Token 注入: 从 localStorage 读取，自动设置 `Authorization` 头
- 响应解析: 统一校验 `{ code, message, data }` 格式
- 错误处理: `ApiError` 类封装，401/403 自动登出

### 数据流

```
页面组件 → fetcher.ts (领域函数) → http.ts (HTTP 客户端) → fetch → Vite Proxy → 后端 API
```

详见 [模块/后端三层架构.md](./模块/后端三层架构.md) 了解后端完整的请求处理流程。

### 前端类型定义

所有 API 响应类型在 `src/api/types.ts` 中定义，前后端通过 `CamelModel` 自动对齐字段命名。

---

## 错误码

| code | 说明 |
|------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 422 | 参数校验失败 |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器内部错误 |

业务错误码通过 `BizError` 异常体系定义，http_status 默认 200，通过 code 字段区分业务含义。