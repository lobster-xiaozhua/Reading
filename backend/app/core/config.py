"""应用配置（基于 Pydantic Settings，支持环境变量与 .env 注入）。"""

from functools import lru_cache

from pydantic import Field, model_validator
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
    db_pool_size: int = 20
    db_max_overflow: int = 30
    db_pool_recycle: int = 1800
    db_echo: bool = False

    # ── Redis ─────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── 鉴权 ──────────────────────────────────────────────
    # 生产环境必须通过环境变量 / .env 提供强随机密钥（>=32 字节），否则启动失败
    jwt_secret: str = "change-me-in-production-min-32-bytes!!"
    jwt_algorithm: str = "HS256"
    access_token_ttl: int = 8 * 3600  # 8 小时
    refresh_token_ttl: int = 30 * 24 * 3600  # 30 天
    refresh_token_ttl_long: int = 90 * 24 * 3600  # remember=true 时 90 天
    # 演示读者 ID / 管理员账号（仅 DEBUG 模式联调使用，生产禁止）
    demo_reader_id: int = 1001
    demo_admin_username: str = "admin"
    demo_admin_password: str = "admin123"

    # ── 限流 ──────────────────────────────────────────────
    rate_limit_login: int = 5
    rate_limit_search: int = 10
    rate_limit_progress: int = 1
    rate_limit_reward: int = 1

    # ── 日志 ─────────────────────────────────────────────
    log_level: str = "INFO"

    # ── 可观测性 ─────────────────────────────────────────
    # 单条 SQL 超过该毫秒数记为慢查询（记录日志并计入 /metrics）
    slow_query_threshold_ms: float = 100.0
    # 单个 Redis 命令超过该毫秒数记为慢命令（计入 /metrics）
    redis_slow_command_threshold_ms: float = 20.0

    # ── CORS ─────────────────────────────────────────────
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    @model_validator(mode="after")
    def _validate_production_secrets(self):
        """生产环境（非 DEBUG）强制校验密钥强度，阻止默认弱密钥上线。"""
        if self.debug:
            return self
        weak_secrets = {"", "change-me-in-production-min-32-bytes!!"}
        if self.jwt_secret in weak_secrets:
            raise ValueError("生产环境必须通过 JWT_SECRET 环境变量配置强随机密钥（>=32 字节）")
        if len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET 长度不足 32 字节，存在被暴力破解风险")
        return self


@lru_cache
def get_settings() -> Settings:
    """单例配置。"""
    return Settings()


settings = get_settings()
