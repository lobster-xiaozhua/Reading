"""浏览器缓存头中间件：为静态数据端点添加 Cache-Control。"""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# 静态数据端点 → 浏览器缓存时长（秒）
# 分类/标签/横幅等极少变更，前端可安全缓存
_STATIC_CACHE: dict[str, int] = {
    "/api/v1/c/categories": 300,
    "/api/v1/c/tags": 300,
    "/api/v1/c/banners": 300,
    "/api/v1/c/search/hot": 300,
    "/api/v1/c/discovery/home": 60,
}


class CacheControlMiddleware(BaseHTTPMiddleware):
    """为 GET 请求的静态数据端点添加 Cache-Control 响应头。"""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        if request.method != "GET" or response.status_code >= 400:
            return response
        max_age = _STATIC_CACHE.get(request.url.path)
        if max_age is not None:
            response.headers["Cache-Control"] = f"public, max-age={max_age}"
        return response
