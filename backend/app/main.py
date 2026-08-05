"""FastAPI 应用入口。

聚合 C/B 端路由，挂载中间件与异常处理，对齐 §3.2 路径前缀。
"""

import contextlib

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine
from app.core.logging import setup_logging
from app.middlewares.access_log import AccessLogMiddleware
from app.middlewares.error_handler import register_exception_handlers
from app.middlewares.trace import TraceMiddleware
from app.models.base import Base

logger = structlog.get_logger(__name__)


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时建表并自动写入种子数据（开发模式）。"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    if settings.debug:
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
        except Exception:
            logger.warning("种子数据写入失败（非阻塞）", exc_info=True)

    yield


def create_app() -> FastAPI:
    setup_logging()

    app = FastAPI(
        title=settings.app_name,
        version="2.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # 中间件（顺序：后添加先执行）
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Trace-Id"],
    )
    app.add_middleware(TraceMiddleware)

    # 请求日志
    app.add_middleware(AccessLogMiddleware)

    # 异常处理
    register_exception_handlers(app)

    # 健康检查
    @app.get("/health", tags=["系统"])
    async def health() -> dict:
        return {"status": "ok", "version": "2.1.0"}

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
