"""限流器实例（slowapi）。

供 main.py 挂载中间件和路由文件添加 @limiter.limit 装饰器使用。
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri="memory://",
)
