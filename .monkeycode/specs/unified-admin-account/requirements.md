# Requirements Document

## Introduction

当前 B 端管理后台（控制台）存在四个独立的演示账号：`admin`（超级管理员）、`content`（内容管理员）、`auditor`（审核员）、`operation`（运营管理员）。

需求是将这四个账号合并为一个统一的超级管理员账号，该账号拥有控制台的所有管理权限和页面访问权。

## Glossary

- **控制台**：B 端管理后台，路由为 `/workbench` 及子路径
- **超级管理员**：拥有全部权限的管理员角色，role_key 为 `super-admin`
- **演示账号**：开发/测试环境的预置账号，password 使用简单凭据

## Requirements

### Requirement 1: 单一管理员账号

**User Story:** AS 控制台管理员，I want 只使用一个账号登录，SO THAT 获得完整的管理权限。

#### Acceptance Criteria

1. WHEN 用户访问 B 端登录页，系统 SHALL 仅展示一个演示账号：`admin / admin123`（超级管理员）
2. WHEN 用户使用 `admin / admin123` 登录，系统 SHALL 返回超级管理员角色及全部权限
3. WHILE 其他三个演示账号（`content`、`auditor`、`operation`）存在于数据库中，系统 SHALL 将其标记为禁用状态（enabled=0）

### Requirement 2: 后端 Demo 账号逻辑

**User Story:** AS 后端开发者，I want 在 DEBUG 模式下确保唯一演示账号存在，SO THAT 避免多账号登录混乱。

#### Acceptance Criteria

1. WHEN `DEBUG=true` 且用户使用 `admin` 登录，系统 SHALL 调用 `_ensure_demo_admin()` 确保 `admin` 账号存在并启用
2. IF `_ensure_demo_admin()` 发现 `content`、`auditor`、`operation` 账号启用，系统 SHALL 将其设为禁用（enabled=0）
3. WHEN `_ensure_demo_admin()` 发现其他演示账号不存在，系统 SHALL 创建它们并设置为禁用状态（enabled=0）

### Requirement 3: 前端登录页更新

**User Story:** AS 控制台用户，I want 登录页只显示统一的超级管理员账号，SO THAT 避免混淆。

#### Acceptance Criteria

1. WHEN 渲染 B 端登录页，系统 SHALL 仅展示一个演示账号卡片：管理员（admin / admin123）
2. WHEN 用户点击「一键填充」，系统 SHALL 自动填充 `admin` / `admin123` 并提交登录
3. WHEN i18n 文案更新，系统 SHALL 移除旧的 `demoContent`、`demoAuditor`、`demoOperation` 键，保留 `demoAdmin`

### Requirement 4: 文档与配置更新

**User Story:** AS 项目维护者，I want README 和配置反映单一管理员架构，SO THAT 新开发者了解正确用法。

#### Acceptance Criteria

1. WHEN 读取 `README.md`，演示账号表格 SHALL 仅包含 `admin` 一行
2. WHEN 读取后端 `config.py`，`demo_admin_username` 和 `demo_admin_password`  SHALL 对应 `admin` / `admin123`
3. WHEN 执行种子脚本 `seed.py`，系统 SHALL 创建或更新 `admin` 账号，其他三个账号保持禁用状态

### Requirement 5: 测试覆盖

**User Story:** AS 测试工程师，I want 登录测试覆盖单一管理员场景，SO THAT 保证向后兼容性。

#### Acceptance Criteria

1. WHEN 执行 `test_auth_service.py`，`test_creates_demo_admin_when_missing` SHALL 验证只创建 `admin` 账号
2. WHEN 执行 `test_keeps_existing_demo_admin`，系统 SHALL 验证 `admin` 存在且其他三个账号被禁用
3. WHEN 使用 `content / content123` 尝试登录，系统 SHALL 返回账号禁用错误（若账号被禁用）
