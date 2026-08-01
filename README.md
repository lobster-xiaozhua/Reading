# Reading
# Reading

一个基于 Monorepo 架构的全栈阅读平台项目，包含 C 端用户阅读应用与 B 端管理后台，采用现代化前端工程化方案与 Python 后端服务构建。

## ✨ 项目特性

- **Monorepo 架构**：基于 pnpm workspace 统一管理前后端代码与公共包
- **前后端分离**：TypeScript 前端 + Python 后端，职责清晰
- **双端并行**：同时支持 C 端用户产品与 B 端管理系统
- **工程化完善**：内置 CI/CD、Storybook 组件库、代码规范等基础设施
- **模块化设计**：公共组件、工具函数抽离为独立 packages，复用性强

## 🛠 技术栈

### 前端
- **语言**：TypeScript
- **包管理**：pnpm + workspace
- **组件开发**：Storybook
- **样式**：CSS
- **构建**：Node.js / Vite 生态

### 后端
- **语言**：Python
- **架构**：模块化后端工程

### 工程化
- **CI/CD**：GitHub Actions
- **代码规范**：统一 TypeScript 配置（tsconfig.base.json）

## 📁 项目结构

```
Reading/
├── .github/workflows/    # CI/CD 工作流配置
├── .storybook/           # Storybook 组件文档配置
├── apps/                 # 应用层（C端、B端等业务应用）
├── backend/              # 后端服务工程
├── packages/             # 公共包（组件库、工具函数等）
├── tools/token-scanner/  # 令牌扫描工具
├── 01-前端底层设计.md     # 前端底层架构设计文档
├── 02-通用设计.md         # 通用设计规范
├── 03-C端专项设计.md      # C端产品专项设计
├── 04-B端专项设计.md      # B端管理后台专项设计
├── 04-B端开发计划.md      # B端开发排期计划
├── 04-C端开发计划.md      # C端开发排期计划
├── 05-后端开发文档.md      # 后端开发说明文档
├── pnpm-workspace.yaml   # pnpm monorepo 配置
├── tsconfig.base.json    # TypeScript 基础配置
└── package.json          # 根项目配置
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 9
- Python >= 3.10

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/lobster-xiaozhua/Reading.git
cd Reading

# 安装全部依赖
pnpm install
```

### 启动开发

#### 前端开发
```bash
# 启动 C 端应用
pnpm -F c-app dev

# 启动 B 端管理后台
pnpm -F admin dev

# 启动 Storybook 组件库
pnpm storybook
```

#### 后端开发
```bash
cd backend
# 安装 Python 依赖并启动服务
pip install -r requirements.txt
python main.py
```

### 代码检查与构建
```bash
# 全量类型检查
pnpm typecheck

# 全量构建
pnpm build
```

## 📚 设计文档

项目包含完整的设计与开发文档，可按顺序查阅：

1. **[前端底层设计](./01-前端底层设计.md)** — 架构选型、目录规范、状态管理、构建方案
2. **[通用设计](./02-通用设计.md)** — 设计系统、组件规范、交互原则
3. **[C 端专项设计](./03-C端专项设计.md)** — 用户端产品功能与页面设计
4. **[B 端专项设计](./04-B端专项设计.md)** — 管理后台功能与权限设计
5. **[后端开发文档](./05-后端开发文档.md)** — 接口定义、数据模型、服务部署

## 📋 开发计划

- [B 端开发计划](./04-B端开发计划.md)
- [C 端开发计划](./04-C端开发计划.md)

## 🧩 模块说明

### apps
存放独立可运行的业务应用，目前包含：
- `admin`：B 端管理后台
- C 端用户应用

### packages
公共可复用包：
- `b-end/components`：B 端通用组件库
- 其他共享工具与 hooks

### tools/token-scanner
代码令牌扫描工具，用于敏感信息检测与代码安全审计。

### backend
完整后端工程，提供数据接口与业务逻辑。

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 License

本项目采用 MIT License。

---

> 项目维护者：lobster-xiaozhua
