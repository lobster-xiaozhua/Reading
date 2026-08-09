"""幂等键执行工具：防止打赏/评论等非幂等写操作重复提交。

客户端为每次「提交意图」生成唯一幂等键（如 UUID），重试时复用同一键；
服务端在 TTL 内对重复键直接返回已处理标记，不重复执行副作用逻辑。
"""

import contextlib

import structlog

logger = structlog.get_logger(__name__)

# 幂等键存储前缀
_IDEM_PREFIX = "idem:"


async def idempotent_run(redis_client: object, idem_key: str, ttl: int, fn) -> tuple[bool, object]:
    """以幂等键执行写操作。

    Args:
        redis_client: Redis 客户端。
        idem_key: 幂等键（含业务前缀与读者 ID，如 ``reward:1001:<uuid>``）。
            为空时不启用幂等，直接执行。
        ttl: 幂等键有效期（秒），覆盖完整提交-确认窗口。
        fn: 实际写操作协程。

    Returns:
        (is_first, result)：首次执行为 (True, 结果)；TTL 内重复键为
        (False, None)；Redis 故障时降级为直接执行 (True, 结果)。
    """
    if not idem_key:
        result = await fn()
        return True, result

    lock_key = f"{_IDEM_PREFIX}{idem_key}"
    try:
        acquired = bool(await redis_client.set(lock_key, "1", nx=True, ex=ttl))
    except Exception:
        logger.debug("幂等键写入失败，降级直接执行 key=%s", idem_key, exc_info=True)
        result = await fn()
        return True, result
    if not acquired:
        return False, None
    try:
        result = await fn()
    except Exception:
        # 执行失败释放幂等键，允许客户端重试
        with contextlib.suppress(Exception):
            await redis_client.delete(lock_key)
        raise
    return True, result
