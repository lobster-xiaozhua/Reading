"""统一异常处理中间件。

将业务异常、Pydantic 校验错误、未捕获异常统一转换为 §5.1 响应格式。
业务错误 HTTP 状态码默认 200（走 code 区分），鉴权类异常保留 4xx。
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import BizError, ErrorCode
from app.schemas.common import Response


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


async def _get_trace_id(request: Request) -> str | None:
    """从请求状态获取 traceId（由 TraceMiddleware 注入）。"""
    return getattr(request.state, "trace_id", None)


async def biz_exception_handler(request: Request, exc: BizError) -> JSONResponse:
    trace_id = await _get_trace_id(request)
    body = Response.error(exc.code, exc.message)
    body.traceId = trace_id
    return JSONResponse(
        status_code=exc.http_status,
        content=body.model_dump(by_alias=True, exclude_none=True),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    trace_id = await _get_trace_id(request)
    body = Response.error(
        ErrorCode.PARAM_INVALID, "参数校验失败", _sanitize_validation_errors(exc.errors())
    )
    body.traceId = trace_id
    # 422 保留，便于前端区分校验错误
    return JSONResponse(
        status_code=422,
        content=body.model_dump(by_alias=True, exclude_none=True),
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    trace_id = await _get_trace_id(request)
    body = Response.error(exc.status_code, exc.detail or "Not Found")
    body.traceId = trace_id
    return JSONResponse(
        status_code=exc.status_code,
        content=body.model_dump(by_alias=True, exclude_none=True),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    trace_id = await _get_trace_id(request)
    body = Response.error(ErrorCode.INTERNAL_ERROR, "服务异常，请稍后重试")
    body.traceId = trace_id
    return JSONResponse(
        status_code=500,
        content=body.model_dump(by_alias=True, exclude_none=True),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """注册全部异常处理器。"""
    app.add_exception_handler(BizError, biz_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
