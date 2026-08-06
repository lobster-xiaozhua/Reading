"""Redis 客户端与缓存键规范（§10.2）。"""

import redis.asyncio as redis
import structlog

from app.core.config import settings


class CacheKeys:
    """集中管理缓存键，避免散落字符串导致拼写错误。"""

    # C 端
    BANNERS = "c:banners"
    HOME = "c:discovery:home"
    HOT_BOOKS = "c:books:hot"
    FREE_LIMITED = "c:books:free-limited"
    EDITOR_PICKS = "c:books:editor-picks"
    CATEGORIES = "c:categories"
    TAGS = "c:tags"
    HOT_SEARCHES = "c:search:hot"
    SEARCH_HOT_ZSET = "c:search:hot:zset"

    @staticmethod
    def book(book_id: int) -> str:
        return f"c:book:{book_id}"

    @staticmethod
    def chapter(chapter_id: int) -> str:
        return f"c:chapter:{chapter_id}"

    @staticmethod
    def book_rating(book_id: int) -> str:
        return f"c:book:{book_id}:rating"

    @staticmethod
    def book_click(book_id: int) -> str:
        return f"book:click:{book_id}"

    @staticmethod
    def rank(rank_type: str) -> str:
        return f"rank:{rank_type}"

    @staticmethod
    def search_suggestion(keyword: str) -> str:
        return f"c:search:sug:{hash(keyword)}"

    @staticmethod
    def heatmap(reader_id: int) -> str:
        return f"c:me:heatmap:{reader_id}"

    # B 端
    WORKBENCH_KPI = "b:workbench:kpi"

    # 鉴权
    @staticmethod
    def access_token(token: str) -> str:
        return f"auth:access:{token}"

    @staticmethod
    def refresh_token(token: str) -> str:
        return f"auth:refresh:{token}"

    # 阅读进度
    @staticmethod
    def progress(reader_id: int) -> str:
        return f"progress:{reader_id}"

    # 登录失败
    @staticmethod
    def login_fail(username: str) -> str:
        return f"login:fail:{username}"


# 全局 Redis 客户端（懒初始化，便于测试替换）
_redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    """获取全局 Redis 客户端。

    DEBUG 模式下连接失败可降级 fakeredis（仅限开发/测试，保证应用可启动）；
    生产环境（非 DEBUG）连接失败直接抛错，避免鉴权/缓存静默失效。
    """
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        client = redis.from_url(settings.redis_url, decode_responses=True)
        await client.ping()
        _redis_client = client
        return _redis_client
    except Exception as exc:
        if not settings.debug:
            logger = structlog.get_logger("api.redis")
            logger.error("Redis connection failed", exc_info=True)
            raise RuntimeError("Redis 连接失败，服务不可用") from exc

        logger = structlog.get_logger("api.redis")
        logger.warning("Redis connection failed, falling back to fakeredis", exc_info=True)
        # 仅 DEBUG 降级到 fakeredis（测试期可用）
        try:
            import fakeredis.aioredis as fakeredis_aio  # type: ignore[import-not-found]

            _redis_client = fakeredis_aio.FakeRedis(decode_responses=True)
        except ImportError:
            raise

    return _redis_client


async def get_redis_client() -> redis.Redis:
    """FastAPI 依赖：提供 Redis 客户端。"""
    return await get_redis()


def reset_redis() -> None:
    """重置全局客户端（测试用）。"""
    global _redis_client
    _redis_client = None
