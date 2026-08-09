"""统一异常处理中间件。

将业务异常、Pydantic 校验错误、未捕获异常统一转换为 §5.1 响应格式。
业务错误 HTTP 状态码默认 200（走 code 区分），鉴权类异常保留 4xx。
"""

import orjson
import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import Response as FastapiResponse

from app.core.exceptions import BizError, ErrorCode
from app.schemas.common import Response as ApiResponse

# 预编译的 orjson options，避免每次调用时重复构造
_ORJSON_OPTS = orjson.OPT_SERIALIZE_NUMPY | orjson.OPT_OMIT_MICROSECONDS


def _orjson_response(status_code: int, body: ApiResponse) -> FastapiResponse:
    """使用 orjson 序列化错误响应（比标准 JSONResponse 快 3-5x）。

    不使用 exclude_none：统一响应体契约要求 data/traceId 字段始终存在
    （即使为 null），前端可统一按契约字段解析。
    """
    return FastapiResponse(
        content=orjson.dumps(
            body.model_dump(by_alias=True),
            default=str,
            option=_ORJSON_OPTS,
        ),
        status_code=status_code,
        media_type="application/json",
    )


def _sanitize_validation_errors(errors: list) -> list[dict]:
    """精简 Pydantic 校验错误，仅保留对前端有用的字段。"""
    simplified: list[dict] = []
    for err in errors:
        loc = err.get("loc", [])
        # 跳过 body/query/path 级别前缀（前端不需要）
        clean_loc = [str(p) for p in loc if p not in ("body", "query", "path")]
        simplified.append(
            {
                "field": ".".join(clean_loc) or str(loc),
                "message": err.get("msg", "参数无效"),
                "type": err.get("type", ""),
            }
        )
    return simplified


# 缓存 trace_id 属性访问结果，避免重复 getattr 调用
def _get_trace_id(request: Request) -> str | None:
    """从请求状态获取 traceId（由 TraceMiddleware 注入）。"""
    state = getattr(request, "state", None)
    if state is None:
        return None
    return getattr(state, "trace_id", None)


async def biz_exception_handler(request: Request, exc: BizError) -> FastapiResponse:
    trace_id = _get_trace_id(request)
    logger = structlog.get_logger("api.error")
    logger.warning(
        "BizError", code=exc.code, message=exc.message, path=request.url.path, trace_id=trace_id
    )
    body = ApiResponse.error(exc.code, exc.message)
    body.traceId = trace_id
    return _orjson_response(exc.http_status, body)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> FastapiResponse:
    trace_id = _get_trace_id(request)
    body = ApiResponse.error(
        ErrorCode.PARAM_INVALID, "参数校验失败", _sanitize_validation_errors(exc.errors())
    )
    body.traceId = trace_id
    # 422 保留，便于前端区分校验错误
    return _orjson_response(422, body)


async def http_exception_handler(request: Request, exc: HTTPException) -> FastapiResponse:
    trace_id = _get_trace_id(request)
    logger = structlog.get_logger("api.error")
    logger.warning(
        "HTTPException",
        status=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        trace_id=trace_id,
    )
    body = ApiResponse.error(exc.status_code, exc.detail or "Not Found")
    body.traceId = trace_id
    return _orjson_response(exc.status_code, body)


async def unhandled_exception_handler(request: Request, exc: Exception) -> FastapiResponse:
    trace_id = _get_trace_id(request)
    logger = structlog.get_logger("api.error")
    logger.exception("Unhandled exception", path=request.url.path, trace_id=trace_id)
    body = ApiResponse.error(ErrorCode.INTERNAL_ERROR, "服务异常，请稍后重试")
    body.traceId = trace_id
    return _orjson_response(500, body)


def register_exception_handlers(app: FastAPI) -> None:
    """注册全部异常处理器。"""
    app.add_exception_handler(BizError, biz_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
