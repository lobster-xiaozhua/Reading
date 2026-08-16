# 数据模型

## 维护原则

ORM 模型位于 `backend/app/models/`，模型定义和 Alembic 迁移是表结构的事实来源。本页记录领域边界、关系和关键约束，避免将每个字段复制为易过期的第二份 schema。

多数业务表使用 `IdMixin` 提供的整数 `id`。`roles` 和 `permissions` 使用业务键作为主键，`system_configs` 使用自增整数主键。带 `TimestampMixin` 的表使用毫秒时间戳 `created_at` 和 `updated_at`；软删除模型使用 `deleted` 标识保留历史数据。

## 领域总览

| 领域 | 表 | 责任 |
|------|----|------|
| 内容 | `novels`、`chapters`、`categories`、`tags`、`banners` | 作品、章节与展示元数据 |
| 身份 | `authors`、`readers`、`admins` | 作者、读者和管理员身份 |
| 阅读 | `bookshelves`、`reading_histories`、`reading_stats_daily` | 收藏、进度与每日统计 |
| 互动 | `comments`、`reviews`、`reward_records`、`comment_likes`、`novel_ratings` | 讨论、评分、打赏和点赞 |
| 审核 | `audit_records`、`audit_histories`、`sensitive_words` | 审核队列、处理历史与词库 |
| 管理 | `roles`、`permissions`、`role_permissions`、`royalty_details`、`system_configs` | 权限、稿费与系统配置 |
| 运营 | `vip_plans`、`reader_notes`、`rum_events` | VIP、笔记与客户端观测数据 |

## 核心关系

```text
Author -> Novel -> Chapter
Reader -> Bookshelf -> Novel
Reader -> ReadingHistory -> Novel / Chapter
Reader -> Comment / Review / RewardRecord / NovelRating -> Novel
Admin -> AuditHistory -> AuditRecord -> Novel or Chapter
Role -> RolePermission -> Permission
```

模型以 ID 字段关联，服务层负责跨表编排。写入业务数据时使用对应服务和仓储层，避免绕过状态流转、缓存失效和审计逻辑。

## 关键完整性约束

| 约束 | 作用 |
|------|------|
| `chapters(novel_id, index)` 唯一 | 保证一部作品内章节序号唯一 |
| `bookshelves(reader_id, novel_id)` 唯一 | 每位读者对每部作品只保留一个书架条目 |
| `reading_histories(reader_id, novel_id)` 唯一 | 每位读者每部作品只保留最新进度 |
| `reading_stats_daily(reader_id, stat_date)` 唯一 | 每日阅读统计可幂等累积 |
| `comment_likes(comment_id, reader_id)` 唯一 | 评论点赞幂等 |
| `novel_ratings(novel_id, reader_id)` 唯一 | 评分写入可更新 |
| `sensitive_words(text, level)` 唯一 | 同级敏感词去重 |

## 演进流程

1. 修改 SQLAlchemy 模型和业务契约。
2. 生成并审阅 Alembic 迁移。
3. 在干净数据库执行迁移和目标测试。
4. 更新本页的领域、关系或约束说明。

开发环境的兼容建表服务用于本地启动；生产结构演进使用 `alembic upgrade head`。部署细节见 [OPERATIONS.md](./OPERATIONS.md)。
