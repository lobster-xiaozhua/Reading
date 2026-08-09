"""Redis 缓存工具函数，消除服务层重复的 _cache_set 实现。"""

import asyncio
import contextlib
import random
import re
from typing import TYPE_CHECKING

import orjson
import structlog

if TYPE_CHECKING:
    pass

logger = structlog.get_logger(__name__)

# 空值缓存标记：用于穿透防护（查询结果不存在时短缓存，避免反复回源）
EMPTY_MARK = "_empty"

# 热 key 分析：将缓存键中的数字 ID 归一化为 {id}，聚合为可观测的模式
_DIGIT_RE = re.compile(r"\d+")


def _cache_pattern(key: str) -> str:
    """将缓存键归一化为模式（数字 ID → {id}），用于热 key 聚合。"""
    return _DIGIT_RE.sub("{id}", key)


def _jittered_ttl(ttl: int, jitter_ratio: float = 0.1) -> int:
    """为 TTL 添加随机抖动，防止大批量缓存同时过期造成穿透。"""
    if ttl <= 0:
        return ttl
    jitter = int(ttl * jitter_ratio)
    return ttl + random.randint(-jitter, jitter)


async def cache_set(redis_client: object, key: str, data: object, ttl: int) -> None:
    """写入 Redis 缓存，失败时仅记录警告。

    Args:
        redis_client: Redis 客户端。
        key: 缓存键。
        data: 缓存数据（dict/list 自动 orjson 序列化，否则调用 model_dump_json）。
        ttl: 过期时间（秒）。
    """
    try:
        if isinstance(data, (dict, list)):
            payload = orjson.dumps(data, default=str).decode("utf-8")
        else:
            payload = data.model_dump_json(by_alias=True)
        await redis_client.set(key, payload, ex=_jittered_ttl(ttl))  # type: ignore[union-attr]
    except Exception:
        logger.warning("缓存写入失败 key=%s", key, exc_info=True)


async def cache_get(redis_client: object, key: str) -> str | None:
    """读取 Redis 缓存并统计命中率（可观测性）。

    返回值与 ``redis.get`` 一致（未命中返回 None）。连接异常按未命中处理。
    """
    from app.core.metrics import inc_cache_access, inc_redis

    try:
        value = await redis_client.get(key)  # type: ignore[union-attr]
    except Exception:
        logger.debug("缓存读取失败 key=%s", key, exc_info=True)
        inc_redis(False)
        inc_cache_access(_cache_pattern(key), False)
        return None
    hit = value is not None
    inc_redis(hit)
    inc_cache_access(_cache_pattern(key), hit)
    return value


async def cache_single_flight(
    redis_client: object,
    lock_key: str,
    loader,
    *,
    lock_ttl: int = 5,
    wait_loops: int = 20,
    wait_interval: float = 0.05,
):
    """单飞执行：同一时刻仅一个调用执行 loader，其余等待锁释放后自行执行。

    适用于重建成本高的热点缓存（如发现页聚合）。loader 必须是完整的
    「读缓存 → 未命中重建 → 写缓存」逻辑，这样等待者在锁释放后执行时
    会命中缓存直接返回，避免重复回源。锁通过 SETNX 实现，非阻塞式
    等待，超时后直接执行保证可用性（防击穿而非强一致）。
    """
    try:
        acquired = bool(await redis_client.set(lock_key, "1", nx=True, ex=lock_ttl))
    except Exception:
        logger.debug("单飞锁获取失败 key=%s", lock_key, exc_info=True)
        acquired = False
    if acquired:
        try:
            return await loader()
        finally:
            with contextlib.suppress(Exception):
                await redis_client.delete(lock_key)
    for _ in range(wait_loops):
        await asyncio.sleep(wait_interval)
        try:
            still_held = await redis_client.exists(lock_key)
        except Exception:
            break
        if not still_held:
            break
    return await loader()
