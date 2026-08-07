"""限流器实例（slowapi）。

供 main.py 挂载中间件和路由文件添加 @limiter.limit 装饰器使用。
生产环境使用 Redis 存储以支持多实例部署，开发环境降级为内存。
"""

import os

from slowapi import Limiter
from slowapi.util import get_remote_address

_redis_url = os.getenv("REDIS_URL", "")
if _redis_url:
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[],
        storage_uri=_redis_url,
    )
else:
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[],
        storage_uri="memory://",
    )
