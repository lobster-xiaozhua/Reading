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
    get_cache_pattern_stats,
    get_metrics,
    get_redis_command_stats,
    get_redis_stats,
    get_slow_query_details,
    get_slow_query_stats,
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

        # 预热敏感词 Trie（首次扫描时自动加载，此处提前加载避免冷启动延迟）
        try:
            from app.services.sensitive_service import SensitiveService

            async with AsyncSessionLocal() as db2:
                redis_client2 = await get_redis_client()
                sensitive_svc = SensitiveService(db2, redis_client2)
                await sensitive_svc._refresh_trie()
                logger.info("敏感词 Trie 预热完成")
        except Exception:
            logger.warning("敏感词 Trie 预热失败（非阻塞）", exc_info=True)

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
        counts, durations, errors = get_metrics()
        lines.append("# HELP http_requests_total Total HTTP requests by path")
        lines.append("# TYPE http_requests_total counter")
        for path, count in sorted(counts.items()):
            safe_path = path.replace("/", "_").strip("_") or "root"
            lines.append(f'http_requests_total{{path="{safe_path}"}} {count}')

        lines.append("")
        lines.append("# HELP http_request_duration_ms HTTP request duration in milliseconds")
        lines.append("# TYPE http_request_duration_ms histogram")
        for path, ds in sorted(durations.items()):
            if not ds:
                continue
            safe_path = path.replace("/", "_").strip("_") or "root"
            lines.append(
                f'http_request_duration_ms{{path="{safe_path}"}} '
                f'{{le="50"}} {sum(1 for d in ds if d <= 50)}'
            )
            lines.append(
                f'http_request_duration_ms{{path="{safe_path}"}} '
                f'{{le="100"}} {sum(1 for d in ds if d <= 100)}'
            )
            lines.append(
                f'http_request_duration_ms{{path="{safe_path}"}} '
                f'{{le="200"}} {sum(1 for d in ds if d <= 200)}'
            )
            lines.append(
                f'http_request_duration_ms{{path="{safe_path}"}} '
                f'{{le="500"}} {sum(1 for d in ds if d <= 500)}'
            )
            lines.append(
                f'http_request_duration_ms{{path="{safe_path}"}} '
                f'{{le="+Inf"}} {len(ds)}'
            )
            lines.append(
                f"http_request_duration_ms_sum{{path=\"{safe_path}\"}} "
                f"{sum(ds):.0f}"
            )
            lines.append(
                f"http_request_duration_ms_count{{path=\"{safe_path}\"}} {len(ds)}"
            )

        lines.append("")
        lines.append("# HELP http_request_errors_total Total HTTP 5xx errors by path")
        lines.append("# TYPE http_request_errors_total counter")
        for path, count in sorted(errors.items()):
            safe_path = path.replace("/", "_").strip("_") or "root"
            lines.append(f'http_request_errors_total{{path="{safe_path}"}} {count}')

        redis_stats = get_redis_stats()
        total_redis = redis_stats["hits"] + redis_stats["misses"]
        hit_rate = redis_stats["hits"] / total_redis if total_redis else 0.0
        lines.append("")
        lines.append("# HELP redis_cache_hits_total Redis cache hits (cache_get)")
        lines.append("# TYPE redis_cache_hits_total counter")
        lines.append(f"redis_cache_hits_total {redis_stats['hits']}")
        lines.append("")
        lines.append("# HELP redis_cache_misses_total Redis cache misses (cache_get)")
        lines.append("# TYPE redis_cache_misses_total counter")
        lines.append(f"redis_cache_misses_total {redis_stats['misses']}")
        lines.append("")
        lines.append("# HELP redis_cache_hit_rate Cache hit rate")
        lines.append("# TYPE redis_cache_hit_rate gauge")
        lines.append(f"redis_cache_hit_rate {hit_rate:.4f}")

        lines.append("")
        lines.append("# HELP redis_cache_pattern_hits_total Cache hits by key pattern")
        lines.append("# TYPE redis_cache_pattern_hits_total counter")
        lines.append("# HELP redis_cache_pattern_misses_total Cache misses by key pattern")
        lines.append("# TYPE redis_cache_pattern_misses_total counter")
        for pattern, (phits, pmisses) in sorted(
            get_cache_pattern_stats().items(), key=lambda kv: -(kv[1][0] + kv[1][1])
        ):
            safe = pattern.replace('"', "_")
            lines.append(f'redis_cache_pattern_hits_total{{pattern="{safe}"}} {phits}')
            lines.append(f'redis_cache_pattern_misses_total{{pattern="{safe}"}} {pmisses}')

        slow_count, slow_avg = get_slow_query_stats()
        lines.append("")
        lines.append("# HELP db_slow_queries_total Slow queries over threshold")
        lines.append("# TYPE db_slow_queries_total counter")
        lines.append(f"db_slow_queries_total {slow_count}")
        lines.append("")
        lines.append("# HELP db_slow_query_avg_ms Average slow query duration ms")
        lines.append("# TYPE db_slow_query_avg_ms gauge")
        lines.append(f"db_slow_query_avg_ms {round(slow_avg, 1) if slow_avg else 0}")
        lines.append("")
        lines.append("# HELP db_slow_query_top_ms Top slow query statements (normalized)")
        lines.append("# TYPE db_slow_query_top_ms gauge")
        for statement, s_duration in get_slow_query_details():
            safe = statement.replace('"', "_")
            lines.append(f'db_slow_query_top_ms{{statement="{safe}"}} {round(s_duration, 1)}')

        redis_cmd_totals, slow_redis = get_redis_command_stats()
        lines.append("")
        lines.append("# HELP redis_command_calls_total Redis command calls")
        lines.append("# TYPE redis_command_calls_total counter")
        for command, count in sorted(redis_cmd_totals.items()):
            lines.append(f'redis_command_calls_total{{command="{command}"}} {count}')
        lines.append("")
        lines.append("# HELP redis_slow_command_calls_total Slow Redis commands (top)")
        lines.append("# TYPE redis_slow_command_calls_total gauge")
        for command, r_duration in slow_redis:
            lines.append(
                f'redis_slow_command_calls_total{{command="{command}"}} {round(r_duration, 1)}'
            )

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
