# 云笈阁 · 小说在线阅读网站

前后端分离的免费小说阅读站，无需登录、无 VIP。支持整本 TXT 上传自动分章、封面上传、按书名/作者/标签/字数/更新时间筛选，以及基于 Meilisearch 的全文检索（书名、作者、章节正文）。

技术栈：

- **前端**：React 18 + Vite + react-router-dom
- **后端**：FastAPI（Python）
- **数据库**：PostgreSQL（书籍元数据、标签、分表存储章节）
- **搜索引擎**：Meilisearch（书名/作者/简介 + 章节正文全文检索，自带中文分词与高亮）

---

## 目录结构

```
Reading/
├── backend/                 # FastAPI 后端
│   ├── main.py              # 路由与启动入口
│   ├── config.py            # 环境变量配置（PostgreSQL / Meilisearch）
│   ├── db.py                # PostgreSQL 存储层（分表、筛选、章节 CRUD）
│   ├── search.py            # Meilisearch 封装（懒初始化）
│   ├── schema.sql           # PostgreSQL 建表语句参考
│   ├── migrate_from_files.py# 从旧版本地文件迁移到 PostgreSQL + Meili
│   └── requirements.txt
└── frontend/                # React 前端
    └── src/
        ├── pages/           # Discover / SearchResults / BookDetail / Reader / Admin
        └── components/      # SearchBar / FilterBar / Toolbar / BookCard ...
```

---

## 一、启动 PostgreSQL

需要本地（或远程）有可用的 PostgreSQL 12+。

```sql
CREATE DATABASE novel_db;
```

后端会在启动时自动建表（`db.init_schema()`），无需手动执行 `schema.sql`。
`schema.sql` 仅供参考表结构。

---

## 二、启动 Meilisearch

不使用 Docker，直接下载官方二进制运行即可。

**Windows：** 从 https://github.com/meilisearch/meilisearch/releases 下载 `meilisearch-windows-amd64.exe`，放到任意目录（如 `C:\meili\`），双击运行或在命令行执行：

```powershell
C:\meili\meilisearch.exe --master-key=your_master_key
```

**Linux / macOS：** 下载对应平台的二进制后赋予执行权限并运行：

```bash
curl -L https://install.meilisearch.com | sh   # 官方一键安装脚本
./meilisearch --master-key=your_master_key
```

> 不设置 `--master-key` 也可启动（本地开发），此时后端 `MEILI_API_KEY` 留空即可。

启动后默认监听 `http://127.0.0.1:7700`。

---

## 三、后端配置

通过环境变量配置（可用 `.env` 文件或系统环境变量）：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PG_HOST` | PostgreSQL 主机 | `127.0.0.1` |
| `PG_PORT` | PostgreSQL 端口 | `5432` |
| `PG_USER` | 用户名 | `postgres` |
| `PG_PASSWORD` | 密码 | `postgres` |
| `PG_DB` | 数据库名 | `novel_db` |
| `MEILI_HOST` | Meilisearch 地址 | `http://127.0.0.1:7700` |
| `MEILI_API_KEY` | Meili 主密钥（无则留空） | 空 |
| `MEILI_BOOKS_INDEX` | 书籍索引名 | `books` |
| `MEILI_CHAPTERS_INDEX` | 章节索引名 | `chapters` |

> 如果 Meilisearch 未启动或不可达，后端**仍可正常启动**，只是 `/api/search` 会返回 503。书籍浏览、阅读、管理功能不依赖搜索引擎。

---

## 四、安装依赖并启动后端

```bash
cd backend
pip install -r requirements.txt
python main.py
# 默认监听 http://127.0.0.1:8000
```

启动时会自动：
1. 连接 PostgreSQL 并建表（`books` / `tags` / `book_tags` / 16 张 `chapters_NN` 分表）。
2. 初始化 Meilisearch 索引（若可用）并设置可搜索/可过滤字段。

---

## 五、从旧版本地文件迁移（可选）

如果你之前用「本地文件目录」版本积累了书籍，可迁移到新架构：

```bash
cd backend
python migrate_from_files.py --book <book_id>   # 单本
python migrate_from_files.py                    # 全部
```

脚本会读取 `books/<id>/{info.json, chapters/*.txt}`，写入 PostgreSQL 并同步到 Meilisearch 索引。

---

## 六、前端

```bash
cd frontend
npm install
npm run dev          # 开发服务器，默认 http://127.0.0.1:5173
# 或
npm run build && npm run preview
```

前端通过 `/api` 访问后端（开发环境在 `vite.config.js` 中配置代理；生产可反向代理或调整 `api.js` 的 baseURL）。

---

## 七、功能说明

- **发现页 `/`**：书籍网格 + 筛选栏（标签多选、字数区间、更新时间、排序），实时筛选。
- **搜索页 `/search?q=`**：书籍与章节正文全文检索，命中关键词高亮，章节结果可直达对应章节阅读。
- **阅读器 `/book/:id/read/:cid`**：调整字号、明暗主题、记忆阅读进度；超长章节采用**虚拟列表**只渲染可视区域，避免卡顿。
- **管理页 `/admin`**：上传整本 TXT 自动分章、上传封面、增删改书籍与章节、管理标签、重命名书籍。

---

## 八、数据模型要点

- 书籍元数据存 `books` 表；标签通过 `tags` / `book_tags` 关联。
- 章节按 `md5(book_id) % 16` 分表到 `chapters_00` ~ `chapters_15`，避免单表过大。
- Meilisearch 中 `books` 索引存书名/作者/简介，`chapters` 索引存章节标题与正文，支持中文分词与高亮。

---

## 运维补充（强基）

### 管理密钥

- 后端 `ADMIN_API_KEY`：空 = 管理接口免认证；非空 = 请求头必须带 `X-Admin-Key`。
- 前端管理页可填写密钥，保存在浏览器 `localStorage`（键名 `novel-admin-key`），由 `src/api.js` 自动附加。

### 健康检查

`GET /api/health` 示例：

```json
{ "ok": true, "status": "ok", "postgres": true, "meilisearch": true }
```

`ok` / `status` 以 PostgreSQL 为准；Meili 失败时仍可能 `ok: true`（搜索不可用）。

### 重建搜索索引

- 管理页按钮，或 `POST /api/admin/reindex`（需管理鉴权）
- 命令行：`cd backend && python reindex.py`

启动顺序建议：PostgreSQL →（可选）Meilisearch → `python main.py` → `npm run dev`。

