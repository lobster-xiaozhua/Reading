"""请求日志中间件：记录方法、路径、状态码、耗时、trace_id。

生产环境使用低开销日志（省略 query_string），同时记录指标数据。
"""

import time

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.metrics import inc_metric

logger = structlog.get_logger("api.access")


class AccessLogMiddleware(BaseHTTPMiddleware):
    """高性能请求日志中间件：生产环境跳过 query_string 以减少字符串分配。"""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = time.perf_counter() - start

        trace_id = getattr(getattr(request, "state", None), "trace_id", None)

        # 生产环境省略 query_string（减少字符串分配），DEBUG 保留完整信息
        if settings.debug:
            qs = str(request.url.query) if request.url.query else None
            logger.info(
                "request",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=int(duration_ms * 1000),
                query_string=qs,
                trace_id=trace_id,
            )
        else:
            logger.info(
                "request",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=int(duration_ms * 1000),
                trace_id=trace_id,
            )

        inc_metric(request.url.path, duration_ms * 1000, response.status_code)

        return response
