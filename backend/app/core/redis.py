"""Redis 客户端与缓存键规范（§10.2）。"""

import hashlib
import threading
import time

import redis.asyncio as redis
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


class CircuitBreaker:
    """简易熔断器：Redis 故障时熔断 10s，避免鉴权完全阻塞。

    状态机：CLOSED → OPEN（连续失败超过 threshold）→ HALF_OPEN（10s 后）→ CLOSED/OPEN
    """

    def __init__(self, name: str, threshold: int = 5, reset_timeout: float = 10.0) -> None:
        self.name = name
        self.threshold = threshold
        self.reset_timeout = reset_timeout
        self._failures = 0
        self._last_failure_time = 0.0
        self._state = "CLOSED"  # CLOSED | OPEN | HALF_OPEN
        self._lock = threading.Lock()

    def record_success(self) -> None:
        with self._lock:
            self._failures = 0
            self._state = "CLOSED"

    def record_failure(self) -> None:
        with self._lock:
            self._failures += 1
            self._last_failure_time = time.monotonic()
            if self._failures >= self.threshold:
                self._state = "OPEN"
                logger.warning("熔断器打开 circuit=%s failures=%d", self.name, self._failures)

    @property
    def is_open(self) -> bool:
        with self._lock:
            if self._state == "OPEN":
                elapsed = time.monotonic() - self._last_failure_time
                if elapsed >= self.reset_timeout:
                    self._state = "HALF_OPEN"
                    logger.info("熔断器半开 circuit=%s", self.name)
                    return False
                return True
            return False


# 全局熔断器实例
_redis_cb = CircuitBreaker("redis", threshold=5, reset_timeout=10.0)


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
    def chapters(book_id: int) -> str:
        return f"c:book:{book_id}:chapters"

    @staticmethod
    def book_click(book_id: int) -> str:
        return f"c:book:click:{book_id}"

    @staticmethod
    def rank(rank_type: str) -> str:
        return f"c:rank:{rank_type}"

    @staticmethod
    def rank_v1(rank_type: str, version: int = 1) -> str:
        return f"c:rank:v{version}:{rank_type}"

    @staticmethod
    def recommend_cold(reader_id: int) -> str:
        return f"c:recommend:cold:{reader_id}"

    RECOMMEND_HOT = "c:recommend:hot"

    @staticmethod
    def search_suggestion(keyword: str) -> str:
        key = hashlib.md5(keyword.encode()).hexdigest()[:16]
        return f"c:search:sug:{key}"

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

    # 拼音候选集
    PINYIN_CANDIDATES = "c:pinyin:candidates"

    # 熔断状态
    CIRCUIT_STATE = "circuit:state"


# 全局 Redis 客户端（懒初始化，便于测试替换）
_redis_client: redis.Redis | None = None
_redis_cb = CircuitBreaker("redis", threshold=5, reset_timeout=10.0)


async def get_redis() -> redis.Redis:
    """获取全局 Redis 客户端。

    DEBUG 模式下连接失败可降级 fakeredis（仅限开发/测试，保证应用可启动）；
    生产环境（非 DEBUG）连接失败直接抛错，避免鉴权/缓存静默失效。
    """
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
            max_connections=50,
        )
        await client.ping()
        _redis_client = client
        _redis_cb.record_success()
        return _redis_client
    except Exception as exc:
        _redis_cb.record_failure()
        if not settings.debug:
            logger.error("Redis connection failed", exc_info=True)
            raise RuntimeError("Redis 连接失败，服务不可用") from exc

        logger.warning("Redis connection failed, falling back to fakeredis", exc_info=True)
        try:
            import fakeredis.aioredis as fakeredis_aio

            _redis_client = fakeredis_aio.FakeRedis(decode_responses=True)
        except ImportError:
            raise

    return _redis_client


async def get_redis_client() -> redis.Redis:
    """FastAPI 依赖：提供 Redis 客户端。"""
    return await get_redis()


def get_circuit_breaker() -> CircuitBreaker:
    """返回 Redis 熔断器实例，供鉴权等关键路径使用。"""
    return _redis_cb


def reset_redis() -> None:
    """重置全局客户端（测试用）。"""
    global _redis_client
    _redis_client = None
    _redis_cb._failures = 0
    _redis_cb._state = "CLOSED"
