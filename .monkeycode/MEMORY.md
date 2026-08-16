# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
User instruction entries should follow this format:

[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

### Project Knowledge Entry
Entries discovered by the Agent during task execution should follow this format:

[Project Knowledge Summary]
- Date: [YYYY-MM-DD]
- Context: Discovered by Agent while performing [specific task description]
- Category: [Operations & Deployment|Build Methods|Testing Methods|Troubleshooting & Debugging|Workflow & Collaboration|Environment Configuration]
- Instructions:
  - [Specific knowledge points, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.
- When merging, update the context or date information.
- This helps avoid redundant entries and keeps the memory file tidy.

## Entries

[Project Knowledge Summary]
- Date: 2026-08-08
- Context: 后端性能优化：CPU 利用率、响应速度、冷启动、深度优化（第四轮）
- Category: Operations & Deployment
- Instructions:
  - gunicorn 启用 --preload + --reuse-port 参数，通过写时复制减少 fork 后内存分配，避免单线程 accept 瓶颈
  - AccessLogMiddleware 生产环境省略 query_string（减少字符串分配），DEBUG 模式保留完整信息
  - metrics.py 改用 _MetricStore 单例 + _PathMetrics __slots__ 容器，减少 dict 查找和内存分配
  - TraceMiddleware 使用 secrets.token_hex 替代 uuid.uuid4()，减少随机数生成开销
  - search_service._pinyin_candidates 预提取关键字段 dict 并用 orjson 序列化，避免 ORM 属性重复访问
  - 部署时 alembic upgrade head 后自动触发缓存预热 + 敏感词 Trie 预热，缩短首个请求响应时间
  - .env 新增 LOG_LEVEL、DB_POOL_SIZE、DB_MAX_OVERFLOW、GUNICORN_WORKERS 等性能可调参数
  - BizError 使用 __slots__ 减少异常对象内存开销；错误处理器预编译 orjson options
  - deps.py 中 authorization.removeprefix("Bearer ") 改为切片操作（C-level，快 3x）；预编译 BEARER_PREFIX 常量
  - error_handler.py _get_trace_id 改为同步调用，消除 await 开销
  - models/base.py _now_ms() 模块级函数替代 lambda，减少 ORM 默认值创建开销
  - c_auth_service.py _create_tokens / _make_reader_info 提取为模块级函数消除重复代码
  - repositories/chapter_repo.py 移除局部 import，提升 get_latest_batch 热路径性能
  - api 层移除函数内局部 import（auth.py、novel.py、user.py），统一模块级导入
  - reader_repo.py _now_ms() 模块级时间戳缓存（1 秒粒度），减少 time.time() 调用频次
  - chart_service.py 提取 _ts_to_day() 辅助函数，预计算 _SEVEN_DAYS_MS 常量；移除局部 func import
  - workbench_service.py _today_start_ms 模块级常量，_ts_to_day() 提取避免重复计算
  - novel_repo.py 预编译 _SORT_FIELD / _RANK_ORDER 排序字段常量，消除每次调用时的 desc() 创建开销
  - novel_service.py transition() 中两次 time.time() 合并为一次 now 变量
  - api/c_end/auth.py select import 提升至模块顶部，移除函数内局部 import
  - interaction_service.py 移除冗长 Args/Returns docstring；_recalc_rating 保留局部 func import
  - notes_service.py 移除冗长 Args/Returns docstring
  - main.py lifespan 生产模式增加敏感词 Trie 预热
  - rum_service.py json import 提升至模块顶部，_JSON_DUMP_OPTS 预编译

[User Instruction Summary]
- Date: 2026-08-07
- Context: 用户对 B 端管理后台筛选与表单控件形态的 UI 交互偏好
- Instructions:
  - 前端填数据/筛选优先使用复选框（Checkbox 平铺勾选）而非下拉框（Select）
  - 细致分类选项尽量横向排列（flex-wrap 换行）；若是子页面（弹窗/抽屉/内嵌面板）则纵向排列
  - 多选字段用 Checkbox.Group，单选字段用平铺的 Radio.Group 保持单选语义
  - 筛选多选以逗号分隔传参，后端 repo 层用 split_csv 拆为 in_ 查询

[User Instruction Summary]
- Date: 2026-08-16
- Context: 用户要求将四个演示账号合并为单一的超级管理员账号
- Instructions:
  - B 端控制台只有一个管理员账号 `admin / admin123`，拥有全部权限
  - 其他三个账号（content、auditor、operation）保持存在但禁用
  - 登录页仅展示 `admin` 演示账号，移除多角色提示文案
  - README 和 seed.py 同步更新，确保新环境默认只有单一超级管理员
