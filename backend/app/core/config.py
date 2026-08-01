"""应用配置（基于 Pydantic Settings，支持环境变量与 .env 注入）。"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """全局配置。

    通过环境变量或 ``.env`` 文件覆盖默认值。开发期默认使用 SQLite 以便零依赖启动，
    生产环境设置 ``DB_URL`` 指向 MySQL。
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── 应用 ──────────────────────────────────────────────
    app_name: str = "小说阅读平台后端"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # ── 数据库 ────────────────────────────────────────────
    # 默认 SQLite（开发/测试零依赖）；生产用 mysql+asyncmy://...
    db_url: str = "sqlite+aiosqlite:///./novel.db"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle: int = 3600
    db_echo: bool = False

    # ── Redis ─────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    # 测试环境无 Redis 时降级为内存模拟
    redis_fallback: bool = True

    # ── 鉴权 ──────────────────────────────────────────────
    jwt_secret: str = "change-me-in-production-min-32-bytes!!"
    jwt_algorithm: str = "HS256"
    access_token_ttl: int = 8 * 3600          # 8 小时
    refresh_token_ttl: int = 30 * 24 * 3600   # 30 天
    refresh_token_ttl_long: int = 90 * 24 * 3600  # remember=true 时 90 天
    # 演示读者 ID（未接入读者登录前用于联调）
    demo_reader_id: int = 1001
    demo_admin_username: str = "admin"
    demo_admin_password: str = "admin123"

    # ── 限流 ──────────────────────────────────────────────
    rate_limit_login: int = 5
    rate_limit_search: int = 10
    rate_limit_progress: int = 1
    rate_limit_reward: int = 1

    # ── CORS ─────────────────────────────────────────────
    cors_origins: list[str] = Field(
        default_factory=lambda: ["*"]
    )


@lru_cache
def get_settings() -> Settings:
    """单例配置。"""
    return Settings()


settings = get_settings()
