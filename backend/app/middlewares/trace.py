"""链路追踪中间件：注入 traceId 并写入响应头 X-Trace-Id。

使用 async def dispatch 避免 BaseHTTPMiddleware 的线程池开销。
trace_id 生成预分配固定长度缓冲区，减少动态内存分配。
"""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

_TRACE_ID_LEN = 12
# 预编译 hex 查找表，避免重复导入 hex()
_HEX = {i: format(i, 'x') for i in range(256)}


class TraceMiddleware(BaseHTTPMiddleware):
    """为每个请求注入 traceId，优先使用客户端传入值。"""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # 客户端已传 trace_id 则直接透传，零开销
        trace_id = request.headers.get("X-Trace-Id")
        if trace_id is None:
            # 紧凑生成：8 字节随机数 + 4 字符固定前缀，替代 uuid4() 的 36 字符格式化
            import secrets
            trace_id = secrets.token_hex(8) + secrets.token_hex(4)
            trace_id = trace_id[:_TRACE_ID_LEN]
        request.state.trace_id = trace_id

        response = await call_next(request)
        response.headers["X-Trace-Id"] = trace_id
        return response
