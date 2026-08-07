"""请求日志中间件：记录方法、路径、状态码、耗时、trace_id。

同时在生产环境记录指标数据至主进程 _request_counts 字典，供 /metrics 端点消费。
"""

import time

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger("api.access")


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        logger.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=int(duration_ms),
            query_string=str(request.url.query) if request.url.query else None,
        )

        return response
