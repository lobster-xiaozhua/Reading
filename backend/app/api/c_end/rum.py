"""C 端 RUM（前端性能指标 / 运行时错误）上报端点。

前端通过 sendBeacon / fetch keepalive 批量上报 Web Vitals 与错误事件，
本端点负责接收并落日志，供可观测性链路消费（不落库、不鉴权，属匿名埋点）。
"""

from typing import Literal

import structlog
from fastapi import APIRouter, Request
from pydantic import Field

from app.api.deps import ok
from app.schemas.common import CamelModel

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
async def ingest_rum(request: Request, body: RumEventBody):
    """接收并记录一条前端上报事件。"""
    logger.info(
        "rum_event",
        type=body.type,
        name=body.name,
        value=body.value,
        rating=body.rating,
        message=body.message,
        meta=body.meta,
    )
    return ok(request)
