"""Redis 缓存工具函数，消除服务层重复的 _cache_set 实现。"""

import json
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    pass

logger = structlog.get_logger(__name__)


async def cache_set(redis_client: object, key: str, data: object, ttl: int) -> None:
    """写入 Redis 缓存，失败时仅记录警告。

    Args:
        redis_client: Redis 客户端。
        key: 缓存键。
        data: 缓存数据（dict/list 自动 JSON 序列化，否则调用 model_dump_json）。
        ttl: 过期时间（秒）。
    """
    try:
        if isinstance(data, (dict, list)):
            payload = json.dumps(data, default=str)
        else:
            payload = data.model_dump_json(by_alias=True)
        await redis_client.set(key, payload, ex=ttl)  # type: ignore[union-attr]
    except Exception:
        logger.warning("缓存写入失败 key=%s", key, exc_info=True)
