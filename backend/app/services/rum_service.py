"""RUM 事件服务：落库、统计、查询（可观测性闭环）。"""

import json

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rum import RumEvent
from app.schemas.common import PagedResult
from app.utils.time import now_ms as _now_ms

logger = structlog.get_logger(__name__)

# 预编译 json 序列化选项
_JSON_DUMP_OPTS = {"ensure_ascii": False, "default": str}


class RumService:
    """RUM 事件读写服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def ingest(self, body: object) -> None:
        """写入一条 RUM 事件；失败仅记录日志，不阻塞上报。"""
        event = RumEvent(
            type=body.type,
            name=body.name,
            value=body.value,
            rating=body.rating,
            message=body.message,
            meta=_json_dumps(body.meta) if body.meta is not None else None,
            created_at=_now_ms(),
        )
        self.session.add(event)
        try:
            await self.session.commit()
        except Exception:
            logger.warning("RUM 事件落库失败", exc_info=True)
            await self.session.rollback()

    async def get_stats(self, hours: int = 24) -> dict:
        """统计最近 hours 小时的性能/错误事件数与指标均值。"""
        since = _now_ms() - hours * 3600 * 1000

        total = await self.session.scalar(
            select(func.count(RumEvent.id)).where(RumEvent.created_at >= since)
        )
        perf_count = await self.session.scalar(
            select(func.count(RumEvent.id)).where(
                RumEvent.created_at >= since, RumEvent.type == "perf"
            )
        )
        error_count = await self.session.scalar(
            select(func.count(RumEvent.id)).where(
                RumEvent.created_at >= since, RumEvent.type == "error"
            )
        )
        avg_lcp = await self.session.scalar(
            select(func.avg(RumEvent.value)).where(
                RumEvent.created_at >= since, RumEvent.type == "perf", RumEvent.name == "LCP"
            )
        )
        by_type = dict(
            (await self.session.execute(
                select(RumEvent.type, func.count(RumEvent.id))
                .where(RumEvent.created_at >= since)
                .group_by(RumEvent.type)
            )).all()
        )
        return {
            "total": int(total or 0),
            "perfCount": int(perf_count or 0),
            "errorCount": int(error_count or 0),
            "avgLcp": round(float(avg_lcp), 1) if avg_lcp else None,
            "byType": {k: int(v) for k, v in by_type.items()},
        }

    async def list_events(
        self, type_: str | None = None, page: int = 1, page_size: int = 20
    ) -> PagedResult[dict]:
        """分页查询 RUM 事件。"""
        stmt = select(RumEvent).order_by(RumEvent.created_at.desc())
        if type_:
            stmt = stmt.where(RumEvent.type == type_)
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()
        rows = (
            await self.session.execute(stmt.offset((page - 1) * page_size).limit(page_size))
        ).scalars().all()
        items = [
            {
                "id": str(e.id),
                "type": e.type,
                "name": e.name,
                "value": e.value,
                "rating": e.rating,
                "message": e.message,
                "meta": _json_loads(e.meta) if e.meta else None,
                "createdAt": e.created_at,
            }
            for e in rows
        ]
        return PagedResult.build(items, total, page, page_size)


def _json_dumps(meta: dict) -> str:
    return json.dumps(meta, **_JSON_DUMP_OPTS)


def _json_loads(raw: str) -> dict:
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return {"raw": raw}
