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

[User Instruction Summary]
- Date: 2026-08-07
- Context: 用户对 B 端管理后台筛选与表单控件形态的 UI 交互偏好
- Instructions:
  - 前端填数据/筛选优先使用复选框（Checkbox 平铺勾选）而非下拉框（Select）
  - 细致分类选项尽量横向排列（flex-wrap 换行）；若是子页面（弹窗/抽屉/内嵌面板）则纵向排列
  - 多选字段用 Checkbox.Group，单选字段用平铺的 Radio.Group 保持单选语义
  - 筛选多选以逗号分隔传参，后端 repo 层用 split_csv 拆为 in_ 查询
