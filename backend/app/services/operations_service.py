"""运行观测服务：隔离 B 端与本机自检服务的通信。"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.core.config import settings
from app.schemas.b_end import (
    OperationCheckResult,
    OperationsSnapshot,
    OperationSummary,
)

logger = structlog.get_logger(__name__)


class OperationsService:
    """将自检服务响应映射为 B 端稳定契约。"""

    def __init__(self, base_url: str | None = None, timeout: float | None = None) -> None:
        self.base_url = (base_url or settings.selfcheck_url).rstrip("/")
        self.timeout = timeout or settings.selfcheck_timeout_seconds

    async def get_snapshot(self) -> OperationsSnapshot:
        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
                ready_response = await client.get("/readyz")
                ready_payload = ready_response.json()
                summary_response = await client.get("/selfcheck/summary")
                summary_payload = summary_response.json()
                latest_response = await client.get("/selfcheck/latest")
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("selfcheck_unavailable", error=str(exc))
            return OperationsSnapshot()

        latest_payload: dict[str, Any] = {}
        if latest_response.status_code == 200:
            latest_payload = latest_response.json()
        report = latest_payload.get("report", {})
        summary = report.get("summary", summary_payload.get("summary", {}))
        return OperationsSnapshot(
            service_status="ready" if ready_response.status_code == 200 else "degraded",
            ready=bool(ready_payload.get("ok", False)),
            failed_dependencies=int(ready_payload.get("failedCount", 0)),
            has_report=bool(summary_payload.get("hasReport", False)),
            job_id=str(latest_payload.get("jobId", summary_payload.get("jobId", ""))),
            job_status=str(latest_payload.get("status", summary_payload.get("status", ""))),
            tag=str(report.get("tag", "")),
            timestamp=str(report.get("timestamp", "")),
            summary=OperationSummary.model_validate(summary),
            results=[OperationCheckResult.model_validate(item) for item in report.get("results", [])],
        )

    async def run(self, tag: str, timeout_ms: int) -> dict[str, Any]:
        return await self._post("/selfcheck/run", {"tag": tag, "timeout_ms": timeout_ms})

    async def get_job(self, job_id: str) -> dict[str, Any]:
        return await self._get(f"/selfcheck/status/{job_id}")

    async def _get(self, path: str) -> dict[str, Any]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.get(path)
            response.raise_for_status()
            return response.json()

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.post(path, json=payload)
            response.raise_for_status()
            return response.json()
