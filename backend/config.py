import os
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env 文件（若存在）
load_dotenv()

# 后端根目录（本文件所在目录）
BASE_DIR = Path(__file__).resolve().parent

# 旧版本地书籍目录（作为迁移数据源）
BOOKS_DIR = BASE_DIR / "books"

# 封面上传目录（运行时写入）
COVERS_DIR = BASE_DIR / "data" / "covers"

# ===================== PostgreSQL 配置（读环境变量，带默认值） =====================
# 默认连接本机已运行的 PostgreSQL（用户按实际环境用环境变量覆盖）。
PG_HOST = os.getenv("PG_HOST", "127.0.0.1")
PG_PORT = int(os.getenv("PG_PORT", "5432"))
PG_USER = os.getenv("PG_USER", "postgres")
PG_PASSWORD = os.getenv("PG_PASSWORD", "postgres")
PG_DB = os.getenv("PG_DB", "novel_db")

# ===================== Meilisearch 配置 =====================
MEILI_HOST = os.getenv("MEILI_HOST", "http://127.0.0.1:7700")
MEILI_API_KEY = os.getenv("MEILI_API_KEY", "")
MEILI_BOOKS_INDEX = os.getenv("MEILI_BOOKS_INDEX", "books")
MEILI_CHAPTERS_INDEX = os.getenv("MEILI_CHAPTERS_INDEX", "chapters")

# 分表数量（章节按 book_id 哈希路由到 chapters_00..chapters_15）
CHAPTER_SHARDS = 16

# 单本 txt 导入大小上限（MB）
MAX_IMPORT_MB = 10
MAX_COVER_MB = 2

# 服务监听配置
HOST = "0.0.0.0"
PORT = 8000

# ===================== JWT 认证 =====================
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 天

# ===================== 管理 API 认证 =====================
# 留空则跳过认证（本地开发）。生产环境请设置一个随机字符串。
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")
