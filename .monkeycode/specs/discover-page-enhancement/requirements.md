# Requirements Document

## Introduction

完善 C 端「发现页」现有内容模块的交互与数据呈现，同时对其直接相关的「搜索页」「分类页」做必要的功能补齐与体验提升。本期不做个性化推荐（「猜你喜欢/为你推荐」）。

范围由用户确认：

- 核心范围：**增强现有模块**（热门/榜单/限免/分类/编辑推荐）与**体验与性能**（聚合接口、骨架屏、错误重试）
- 直接相关功能：**包含**搜索页与分类页改造
- 个性化推荐：**本期不做**

## Glossary

- **发现页**：C 端首页（`/`，`DiscoverPage`），含 Banner、本周热门、限免专区、分类入口、编辑推荐、排行榜
- **搜索页**：`/search`（`SearchPage`），含联想建议、搜索历史、热门搜索、搜索结果
- **分类页**：`/category`（`CategoryPage`），含分类树、标签筛选、排序 Tab、书籍网格、分页
- **聚合接口**：后端一次性返回发现页全部模块数据的接口
- **空态**：模块无数据时的占位展示（`EmptyState`）
- **错误态**：接口请求失败时的占位展示与重试入口

## Requirements

### Requirement 1 · 发现页数据加载聚合

**User Story:** AS 读者，I want 打开首页一次性获得全部模块数据，so that 页面加载更快、请求更少。

#### Acceptance Criteria

1. WHEN 读者访问发现页，系统 SHALL 通过单个聚合接口 `/discovery/home` 返回 Banner、本周热门、限免、编辑推荐、排行榜、分类六类数据，替代前端 5 个并行请求
2. WHEN 聚合接口整体加载中，系统 SHALL 展示页面级骨架屏
3. WHEN 聚合接口请求失败，系统 SHALL 展示整页错误态并提供「重试」按钮
4. WHEN 读者点击「重试」，系统 SHALL 重新发起聚合请求
5. 聚合接口 SHALL 复用现有 Cache-Aside 缓存策略，单模块缓存键与 TTL 保持不变
6. 聚合接口失败 SHALL NOT 影响前端页面的正常渲染路径（前端仍可按模块容错）

### Requirement 2 · 本周热门与编辑推荐增强

**User Story:** AS 读者，I want 更丰富地浏览热门与编辑推荐，so that 发现更多好作品。

#### Acceptance Criteria

1. WHEN 本周热门有数据，系统 SHALL 展示横向卡片列表并可点击进入书籍详情
2. WHEN 本周热门无数据，系统 SHALL 展示空态提示
3. WHEN 编辑推荐有数据，系统 SHALL 展示 No.1~No.6 位推荐书籍（封面 + 简介 + 分类）
4. WHEN 编辑推荐无数据，系统 SHALL 展示空态提示
5. 每个模块 SHALL 提供「更多」入口跳转至对应分类排序页

### Requirement 3 · 限免专区增强

**User Story:** AS 读者，I want 了解限免书籍的真实限免截止时间，so that 合理安排阅读。

#### Acceptance Criteria

1. WHEN 限免专区有数据，系统 SHALL 展示限免书籍网格与真实限免截止倒计时
2. WHEN 限免截止时间不可得，系统 SHALL 以降级文案展示（如「限免中」）而非错误倒计时
3. WHEN 限免专区无数据，系统 SHALL 展示空态提示
4. WHEN 读者点击限免书籍，系统 SHALL 跳转至书籍详情页

### Requirement 4 · 分类入口增强

**User Story:** AS 读者，I want 通过分类入口快速定位目标分类，so that 更快找到想读的类型。

#### Acceptance Criteria

1. WHEN 分类有数据，系统 SHALL 展示分类图标、名称与书籍数量
2. WHEN 分类存在二级分类，系统 SHALL 展示二级分类入口并支持跳转
3. WHEN 读者点击分类项，系统 SHALL 跳转至对应分类的书籍列表页
4. WHEN 分类无数据，系统 SHALL 隐藏该模块而非展示空态

### Requirement 5 · 排行榜增强

**User Story:** AS 读者，I want 完整浏览各榜单，so that 了解站内人气作品全貌。

#### Acceptance Criteria

1. WHEN 读者切换榜单 Tab（人气/收藏/月票/新书），系统 SHALL 加载并展示对应榜单
2. 排行榜 SHALL 展示 Top 8 作品（排名、书名、作者），前三名高亮显示
3. WHEN 榜单加载失败，系统 SHALL 展示错误态与重试入口，且 SHALL NOT 影响其他模块
4. 排行榜 SHALL 提供「更多」入口跳转完整榜单页
5. 榜单切换期间 SHALL 展示轻量加载状态（不闪动已加载内容）

### Requirement 6 · 模块级错误容错

**User Story:** AS 读者，I want 单个模块加载失败不拖垮整页，so that 页面其余内容仍可使用。

#### Acceptance Criteria

1. IF 任一模块请求失败，系统 SHALL 仅在该模块展示错误态，其余模块正常渲染
2. 模块级错误态 SHALL 提供「重试」按钮，点击后 SHALL 重新请求该模块
3. 页面级加载失败与模块级加载失败 SHALL 有可区分的 UI

### Requirement 7 · 搜索页结果分页与加载更多

**User Story:** AS 读者，I want 搜索更多结果，so that 不错过相关书籍。

#### Acceptance Criteria

1. WHEN 搜索结果总数超过单页数量，系统 SHALL 展示「加载更多」按钮
2. WHEN 读者点击「加载更多」，系统 SHALL 追加下一页结果
3. WHEN 所有结果加载完毕，系统 SHALL 展示「已加载全部」提示
4. WHEN 加载更多请求失败，系统 SHALL 展示错误提示并可重试
5. 搜索结果为空时 SHALL 展示空态（保持现状）

### Requirement 8 · 搜索页热门搜索与历史优化

**User Story:** AS 读者，I want 便捷地通过热门词与历史词发起搜索，so that 减少输入成本。

#### Acceptance Criteria

1. WHEN 搜索框为空，系统 SHALL 展示搜索历史（可单条删除、可清空）与热门搜索
2. WHEN 读者点击历史或热门词，系统 SHALL 以该词发起搜索
3. 热门搜索前三名 SHALL 有高亮样式

### Requirement 9 · 分类页功能补强

**User Story:** AS 读者，I want 更精确地按标签筛选书籍，so that 找到符合口味的作品。

#### Acceptance Criteria

1. 分类页标签筛选 SHALL 由后端过滤（`/books` 接口 `tags` 参数），前端 SHALL NOT 做客户端二次过滤
2. WHEN 读者切换分类/排序/标签/连载状态，系统 SHALL 重置页码并重新加载列表
3. 分类树 SHALL 支持展示二级分类
4. 当页码超出总页数，系统 SHALL 自动回退至第一页（保持现状）
5. 列表加载失败 SHALL 展示错误态与重试按钮

### Requirement 10 · 通用体验与一致性

**User Story:** AS 读者，I want 一致的加载与空态体验，so that 使用更流畅。

#### Acceptance Criteria

1. 所有列表模块 SHALL 使用统一的骨架屏组件
2. 所有空数据场景 SHALL 使用统一的 `EmptyState` 组件与文案风格
3. 所有图片 SHALL 使用懒加载与统一占位
4. 三个页面（发现/搜索/分类）之间的跳转链路 SHALL 保持 URL 参数同步正确

## Out of Scope

- 个性化推荐（「猜你喜欢/为你推荐」）——本期不做
- 读者登录态驱动的个性化内容
- Banner 运营位的后台配置管理
- H5 移动端适配（另有 S4 阶段规划）
