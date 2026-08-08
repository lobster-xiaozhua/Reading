"""C 端 RUM（前端性能指标 / 运行时错误）上报端点。

前端通过 sendBeacon / fetch keepalive 批量上报 Web Vitals 与错误事件，
本端点接收事件并落库（匿名埋点、不鉴权），供 B 端可观测性查询消费。
"""

from typing import Literal

import structlog
from fastapi import APIRouter, Depends, Request
from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok
from app.core.database import get_db
from app.core.limiter import limiter
from app.schemas.common import CamelModel
from app.services.rum_service import RumService

router = APIRouter(prefix="/rum", tags=["RUM"])

logger = structlog.get_logger(__name__)


class RumEventBody(CamelModel):
    """单条 RUM 事件。"""

    type: Literal["perf", "error"] = Field(default="perf", description="事件类型")
    name: str = Field(..., max_length=64, description="指标/错误名")
    value: float | None = Field(default=None, description="指标值（ms）")
    rating: str | None = Field(
        default=None, max_length=32, description="指标评级 good/needs-improvement/poor"
    )
    message: str | None = Field(default=None, max_length=1024, description="错误消息")
    meta: dict | None = Field(default=None, description="附加上下文（path/method/status 等）")


@router.post("")
@limiter.limit("600/minute")
async def ingest_rum(
    request: Request,
    body: RumEventBody,
    db: AsyncSession = Depends(get_db),
):
    """接收并落库一条前端上报事件（按 IP 限流，防恶意刷库）。"""
    logger.info(
        "rum_event",
        type=body.type,
        name=body.name,
        value=body.value,
        rating=body.rating,
        message=body.message,
        meta=body.meta,
    )
    await RumService(db).ingest(body)
    return ok(request)
