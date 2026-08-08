"""FastAPI 应用入口。

聚合 C/B 端路由，挂载中间件与异常处理，对齐 §3.2 路径前缀。
"""

import contextlib
import os
from typing import Any

import orjson
import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app import __version__
from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import UnauthorizedError
from app.core.limiter import limiter
from app.core.logging import setup_logging
from app.middlewares.access_log import AccessLogMiddleware
from app.middlewares.cache_control import CacheControlMiddleware
from app.middlewares.error_handler import register_exception_handlers
from app.middlewares.trace import TraceMiddleware
from app.models.base import Base

logger = structlog.get_logger(__name__)

# 种子数据标记文件：避免每次启动都查库检测种子是否存在
SEED_MARKER = os.path.join(os.path.dirname(__file__), "..", ".seed-initialized")

# ── 进程内请求指标（由 AccessLogMiddleware 写入，/metrics 端点消费） ──
from app.core.metrics import (  # noqa: E402
    request_counts,
    request_durations,
    request_errors,
)


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：建表（DEBUG 模式自动建表便于开发）并自动写入种子数据。"""
    if settings.debug:
        # 开发模式：自动建表 + 种子数据（生产环境使用 alembic upgrade head 迁移）
        async with engine.begin() as conn:
            await conn.run_sync(
                lambda sync_conn: Base.metadata.create_all(
                    sync_conn, checkfirst=True
                )
            )
        # 轻量兼容迁移：为旧库补充新增列（如 comments.deleted），避免 schema 漂移
        try:
            from app.core.database import ensure_schema_compat

            await ensure_schema_compat()
        except Exception:
            logger.warning("schema compat 迁移失败（非阻塞）", exc_info=True)

        # 已有标记文件则跳过种子检测，避免每次启动查库
        if not os.path.exists(SEED_MARKER):
            try:
                from sqlalchemy import select

                from app.core.database import AsyncSessionLocal
                from app.models.novel import Novel

                async with AsyncSessionLocal() as db:
                    exists = (await db.execute(select(Novel).limit(1))).scalars().first()
                    if not exists:
                        from scripts.seed import seed

                        await seed()
                        logger.info("种子数据已自动写入")
                    else:
                        logger.debug("种子数据已存在，跳过")
                # 写入标记，后续启动跳过检测
                try:
                    with open(SEED_MARKER, "w", encoding="utf-8") as f:
                        f.write("initialized")
                except OSError:
                    logger.debug("写入种子标记失败（非阻塞）")
            except Exception:
                logger.warning("种子数据写入失败（非阻塞）", exc_info=True)
    else:
        # 生产模式：不自动建表，依赖 alembic 迁移；启动后预热核心缓存
        logger.info("生产模式启动：依赖 alembic upgrade head 完成建表")
        try:
            from app.core.database import AsyncSessionLocal
            from app.core.redis import get_redis_client

            async with AsyncSessionLocal() as db:
                redis_client = await get_redis_client()
                from app.services.discovery_service import DiscoveryService

                warmup_svc = DiscoveryService(db, redis_client)
                stats = await warmup_svc.warmup()
                logger.info("缓存预热完成", **stats)
        except Exception:
            logger.warning("缓存预热失败（非阻塞）", exc_info=True)

    yield


class _ORJSONResponse(JSONResponse):
    """使用 orjson 加速 JSON 序列化（比标准 json 快 3-5x）。"""
    media_type = "application/json"

    def render(self, content: Any) -> bytes:
        return orjson.dumps(
            content,
            default=str,
            option=orjson.OPT_SERIALIZE_NUMPY | orjson.OPT_OMIT_MICROSECONDS,
        )


def create_app() -> FastAPI:
    setup_logging()

    # 生产环境关闭文档端点，避免暴露 OpenAPI 结构
    docs_kwargs = (
        {"docs_url": None, "redoc_url": None, "openapi_url": None}
        if not settings.debug
        else {
            "docs_url": "/docs",
            "redoc_url": "/redoc",
            "openapi_url": "/openapi.json",
        }
    )

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        lifespan=lifespan,
        default_response_class=_ORJSONResponse,
        **docs_kwargs,
    )

    app.state.orjson_available = True

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # 中间件（顺序：后添加先执行）
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Trace-Id"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(TraceMiddleware)
    app.add_middleware(CacheControlMiddleware)

    # 请求日志
    app.add_middleware(AccessLogMiddleware)

    # 异常处理
    register_exception_handlers(app)

    # 健康检查
    @app.get("/health", tags=["系统"])
    async def health() -> dict:
        return {"status": "ok", "version": __version__}

    # 指标端点（Prometheus 格式；生产环境要求有效 JWT，避免暴露内部路径）
    @app.get("/metrics", tags=["系统"])
    async def metrics(request: Request) -> PlainTextResponse:
        if not settings.debug:
            authorization = request.headers.get("Authorization", "")
            token = authorization.removeprefix("Bearer ").strip()
            if not token:
                raise UnauthorizedError("未授权访问指标")
            try:
                from app.core.security import decode_token

                payload = decode_token(token)
                if payload.get("type") != "access":
                    raise ValueError("token 类型错误")
            except Exception as err:
                raise UnauthorizedError("Token 无效或已过期") from err
        lines: list[str] = []
        lines.append("# HELP http_requests_total Total HTTP requests by path")
        lines.append("# TYPE http_requests_total counter")
        for path, count in sorted(request_counts.items()):
            safe_path = path.replace("/", "_").strip("_") or "root"
            lines.append(f'http_requests_total{{path="{safe_path}"}} {count}')

        lines.append("")
        lines.append("# HELP http_request_duration_ms HTTP request duration in milliseconds")
        lines.append("# TYPE http_request_duration_ms histogram")
        for path, durations in sorted(request_durations.items()):
            if not durations:
                continue
            safe_path = path.replace("/", "_").strip("_") or "root"
            lines.append(
                f'http_request_duration_ms{{path="{safe_path}"}} '
                f'{{le="50"}} {sum(1 for d in durations if d <= 50)}'
            )
            lines.append(
                f'http_request_duration_ms{{path="{safe_path}"}} '
                f'{{le="100"}} {sum(1 for d in durations if d <= 100)}'
            )
            lines.append(
                f'http_request_duration_ms{{path="{safe_path}"}} '
                f'{{le="200"}} {sum(1 for d in durations if d <= 200)}'
            )
            lines.append(
                f'http_request_duration_ms{{path="{safe_path}"}} '
                f'{{le="500"}} {sum(1 for d in durations if d <= 500)}'
            )
            lines.append(
                f'http_request_duration_ms{{path="{safe_path}"}} '
                f'{{le="+Inf"}} {len(durations)}'
            )
            lines.append(
                f"http_request_duration_ms_sum{{path=\"{safe_path}\"}} "
                f"{sum(durations):.0f}"
            )
            lines.append(
                f"http_request_duration_ms_count{{path=\"{safe_path}\"}} {len(durations)}"
            )

        lines.append("")
        lines.append("# HELP http_request_errors_total Total HTTP 5xx errors by path")
        lines.append("# TYPE http_request_errors_total counter")
        for path, count in sorted(request_errors.items()):
            safe_path = path.replace("/", "_").strip("_") or "root"
            lines.append(f'http_request_errors_total{{path="{safe_path}"}} {count}')

        return PlainTextResponse("\n".join(lines) + "\n")

    # 业务路由（C/B 端物理隔离，§2.3）
    _register_routers(app)

    return app


def _register_routers(app: FastAPI) -> None:
    """挂载 C 端与 B 端路由（见各 api 子模块）。"""
    from app.api.b_end import router as b_router
    from app.api.c_end import router as c_router

    app.include_router(c_router, prefix=f"{settings.api_v1_prefix}/c", tags=["C 端"])
    app.include_router(b_router, prefix=f"{settings.api_v1_prefix}/b", tags=["B 端"])


app = create_app()
